#!/usr/bin/env python3
"""Import CSS theme URLs or plain asset URLs into a portable CHESSNITE skin/sound pack."""

from __future__ import annotations

import argparse
import hashlib
import html
import io
import json
import re
import shutil
import struct
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PIECE_CODES = tuple(color + piece for color in "wb" for piece in "pnbrqk")
MAX_ASSET_BYTES = 10 * 1024 * 1024
MAX_INPUT_BYTES = 1024 * 1024
DECLARATION = re.compile(
    r"(?P<property>--theme-(?:piece-set-(?:[wb][pnbrqk])|board-style-image(?:-[a-zA-Z0-9-]+)?|sound-set-(?:mp3|ogg|webm|wav)-[a-zA-Z0-9_][a-zA-Z0-9_-]*))"
    r"\s*:\s*url\(\s*(?:'(?P<single>[^']*)'|\"(?P<double>[^\"]*)\"|(?P<bare>[^)\s]*))\s*\)",
    re.IGNORECASE,
)
PLAIN_URL = re.compile(r"https?://[^\s<>\"'`)]+", re.IGNORECASE)


class ImportFailure(Exception):
    """An actionable validation or download error."""


class ImportCancelled(ImportFailure):
    """An import was cancelled before publishing its staged files."""


def validate_url(url: str) -> str:
    if any(ord(char) < 32 for char in url):
        raise ImportFailure("Asset URLs cannot contain control characters.")
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError as exc:
        raise ImportFailure(f"Invalid asset URL: {url}") from exc
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        raise ImportFailure(f"Only absolute HTTPS asset URLs are supported: {url}")
    if parsed.username is not None or parsed.password is not None:
        raise ImportFailure("Do not put credentials inside asset URLs.")
    if port is not None and port != 443:
        raise ImportFailure("Asset URLs must use the standard HTTPS port (443).")
    return url


def parse_skin(text: str) -> tuple[dict[str, tuple[str, str]], float | None]:
    """Return asset key -> (CSS property, URL), and optional perspective metadata."""
    # Ignore commented-out theme declarations and pasted Markdown fences.
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    assets: dict[str, tuple[str, str]] = {}

    def add(prop: str, url: str) -> None:
        prop = prop.lower()
        if not url.strip():
            return  # Empty alternate-format declarations are common in theme CSS.
        url = validate_url(url.strip())
        if prop.startswith("--theme-piece-set-"):
            key = prop.removeprefix("--theme-piece-set-")
        elif prop.startswith("--theme-sound-set-"):
            key = "sound-" + prop.removeprefix("--theme-sound-set-")
        else:
            suffix = prop.removeprefix("--theme-board-style-image")
            key = "board" + suffix
        if key in assets and assets[key] != (prop, url):
            raise ImportFailure(f"Multiple different URLs for {prop}; paste one skin at a time.")
        assets[key] = (prop, url)

    matches = list(DECLARATION.finditer(text))
    for match in matches:
        add(match["property"], match["single"] or match["double"] or match["bare"] or "")

    # Also find bare URLs outside CSS declarations, e.g. piece CSS + a board link.
    remainder = DECLARATION.sub("", text)
    remainder = re.sub(r"--[\w-]+\s*:\s*url\([^)]*\)", "", remainder, flags=re.I)
    for url in PLAIN_URL.findall(remainder):
        filename = unquote(urlsplit(url).path).rsplit("/", 1)[-1].lower()
        stem = filename.rsplit(".", 1)[0]
        extension = filename.rsplit(".", 1)[-1]
        if stem in PIECE_CODES:
            add(f"--theme-piece-set-{stem}", url)
        elif stem == "3dboard":
            add("--theme-board-style-image-3d-board", url)
        elif stem == "board":
            add("--theme-board-style-image", url)
        elif extension in {"mp3", "ogg", "webm", "wav"} and re.fullmatch(r"[a-z0-9_][a-z0-9_-]*", stem):
            add(f"--theme-sound-set-{extension}-{stem}", url)
        elif filename == "_archive.zip":
            add("--theme-sound-set-mp3-_archive", url)
        else:
            raise ImportFailure(
                f"Cannot infer the role of {filename!r}. Use a named CSS declaration."
            )

    if not assets:
        raise ImportFailure("No nonempty supported theme asset URLs found. See tools/examples/.")
    perspective_matches = re.findall(r"--theme-piece-set-perspective\s*:\s*([^;\s}]+)", text, re.I)
    perspective = None
    if perspective_matches:
        try:
            perspective = float(perspective_matches[-1])
        except ValueError as exc:
            raise ImportFailure("Piece perspective must be a number between 0 and 10.") from exc
        if not 0 <= perspective <= 10:
            raise ImportFailure("Piece perspective must be a finite number between 0 and 10.")
    return assets, perspective


class HTTPSRedirectsOnly(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def image_format(data: bytes) -> tuple[str, str]:
    """Detect raster formats from bytes rather than trusting the URL or MIME header."""
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 33 and data[12:16] == b"IHDR":
        width, height = struct.unpack(">II", data[16:24])
        if not (0 < width <= 16384 and 0 < height <= 16384):
            raise ImportFailure("PNG dimensions are empty or exceed 16384 pixels.")
        return ".png", "image/png"
    if len(data) >= 16 and data.startswith(b"\xff\xd8\xff") and data.endswith(b"\xff\xd9"):
        return ".jpg", "image/jpeg"
    if len(data) >= 13 and data[:6] in (b"GIF87a", b"GIF89a"):
        return ".gif", "image/gif"
    if len(data) >= 16 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp", "image/webp"
    raise ImportFailure("Response is not a supported raster image (PNG, JPEG, GIF, or WebP).")


def audio_format(data: bytes) -> tuple[str, str]:
    """Check audio container/frame signatures; this does not fully decode audio."""
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return ".wav", "audio/wav"
    if data.startswith(b"OggS") and (b"\x01vorbis" in data[:4096] or b"OpusHead" in data[:4096]):
        return ".ogg", "audio/ogg"
    if data.startswith(b"\x1a\x45\xdf\xa3") and b"webm" in data[:4096]:
        return ".webm", "audio/webm"
    offset = 0
    if data.startswith(b"ID3") and len(data) >= 10:
        if any(value & 128 for value in data[6:10]):
            raise ImportFailure("Invalid MP3 ID3 tag length.")
        tag_size = sum(value << shift for value, shift in zip(data[6:10], (21, 14, 7, 0)))
        offset = 10 + tag_size + (10 if data[5] & 0x10 else 0)
    # Some encoders leave padding before the first MPEG frame.
    for index in range(offset, min(offset + 4096, len(data) - 3)):
        a, b, c = data[index:index + 3]
        if (a == 0xff and b & 0xe0 == 0xe0 and (b >> 3) & 3 != 1
                and (b >> 1) & 3 != 0 and (c >> 4) not in (0, 15) and (c >> 2) & 3 != 3):
            return ".mp3", "audio/mpeg"
    raise ImportFailure("Response is not supported audio (MP3, Ogg Vorbis/Opus, WebM, or WAV).")


def asset_format(key: str, data: bytes) -> tuple[str, str]:
    if not key.startswith("sound-"):
        return image_format(data)
    expected, event = key.removeprefix("sound-").split("-", 1)
    if event == "_archive":
        if not zipfile.is_zipfile(io.BytesIO(data)):
            raise ImportFailure("Sound archive response is not a valid ZIP file.")
        return ".zip", "application/zip"
    extension, media_type = audio_format(data)
    if extension != "." + expected:
        raise ImportFailure(f"Sound declares {expected} but downloaded data is {extension}.")
    return extension, media_type


def download_asset(url: str, timeout: float) -> tuple[bytes, str]:
    request = Request(validate_url(url), headers={"User-Agent": "CHESSNITE-Skin-Importer/1.0"})
    try:
        with build_opener(HTTPSRedirectsOnly()).open(request, timeout=timeout) as response:
            validate_url(response.geturl())
            length = response.headers.get("Content-Length")
            if length and length.isdigit() and int(length) > MAX_ASSET_BYTES:
                raise ImportFailure(f"Asset exceeds the {MAX_ASSET_BYTES // 1024 // 1024} MB limit.")
            data = response.read(MAX_ASSET_BYTES + 1)
            if len(data) > MAX_ASSET_BYTES:
                raise ImportFailure("Asset exceeds the 10 MB limit.")
            return data, response.geturl()
    except HTTPError as exc:
        raise ImportFailure(f"HTTP {exc.code} downloading {url}") from exc
    except (URLError, TimeoutError, OSError) as exc:
        raise ImportFailure(f"Could not download {url}: {exc}") from exc


def recover_archive_sounds(stage: Path, manifest: dict, progress) -> None:
    """Read only uniquely matched missing audio members into controlled local paths."""
    normalize = lambda value: re.sub(r"[^a-z0-9]", "", value.lower())
    for failure in manifest["failed_assets"]:
        key = failure["key"]
        if not key.startswith("sound-"):
            continue
        fmt, event = key.removeprefix("sound-").split("-", 1)
        if event == "_archive":
            continue
        candidates = []
        for archive in manifest["archives"].values():
            with zipfile.ZipFile(stage / archive["path"]) as zipped:
                for member in zipped.infolist():
                    path = Path(member.filename.replace("\\", "/"))
                    if (member.is_dir() or any(part.startswith(".") or part == "__MACOSX" for part in path.parts)
                            or path.suffix.lower() != "." + fmt or normalize(path.stem) != normalize(event)
                            or member.file_size > MAX_ASSET_BYTES or member.flag_bits & 1
                            or (member.external_attr >> 16) & 0o170000 == 0o120000):
                        continue
                    candidates.append((archive, member.filename))
        # An ambiguous match should not silently select a different sound variant.
        if len(candidates) != 1:
            continue
        archive, member_name = candidates[0]
        try:
            with zipfile.ZipFile(stage / archive["path"]) as zipped:
                with zipped.open(member_name) as stream:
                    data = stream.read(MAX_ASSET_BYTES + 1)
            if len(data) > MAX_ASSET_BYTES:
                continue
            extension, media_type = asset_format(key, data)
        except (ImportFailure, OSError, zipfile.BadZipFile, RuntimeError, NotImplementedError):
            continue
        relative_path = f"sounds/{event}{extension}"
        (stage / "sounds").mkdir(exist_ok=True)
        (stage / relative_path).write_bytes(data)
        manifest["sounds"].setdefault(event, {})[fmt] = {
            "path": relative_path, "css_property": failure["css_property"],
            "source_url": archive["source_url"], "resolved_url": archive["resolved_url"],
            "archive_member": member_name, "requested_source_url": failure["source_url"],
            "media_type": media_type, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
        }
        failure["recovered_path"] = relative_path
        progress(f"Recovered {event} ({fmt}) from archive member {member_name}.")


def preview_html(manifest: dict) -> str:
    name = html.escape(manifest["name"])
    pieces = manifest["pieces"]
    ranks = [
        ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
        ["bp"] * 8, *([[None] * 8] * 4), ["wp"] * 8,
        ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"],
    ]
    squares = []
    for row, rank in enumerate(ranks):
        for col, code in enumerate(rank):
            content = ""
            if code in pieces:
                content = f'<img src="{pieces[code]["path"]}" alt="{code}" draggable="false">'
            elif code:
                content = f'<span class="missing">{code}</span>'
            squares.append(f'<div class="square {"dark" if (row + col) % 2 else "light"}">{content}</div>')
    boards = "".join(
        f'<figure><figcaption>{html.escape(key)} (image reference)</figcaption>'
        f'<img class="board-image" src="{asset["path"]}" alt="Imported board image"></figure>'
        for key, asset in manifest["boards"].items()
    )
    sound_rows = []
    for event, formats in sorted(manifest.get("sounds", {}).items()):
        sources = "".join(
            f'<source src="{asset["path"]}" type="{asset["media_type"]}">'
            for asset in formats.values()
        )
        links = " · ".join(f'<a href="{asset["path"]}">{fmt.upper()}</a>' for fmt, asset in formats.items())
        sound_rows.append(f'<article class="sound"><h3>{html.escape(event)}</h3>'
                          f'<audio controls preload="none">{sources}Audio playback is unavailable.</audio><p>{links}</p></article>')
    sounds = ('<section><h2>Sound events</h2><p>Press Play to audition each event. Nothing plays automatically.</p>'
              '<div class="sounds">' + "".join(sound_rows) + '</div></section>') if sound_rows else ""
    archives = "".join(f'<p><a href="{asset["path"]}" download>Download source archive: {html.escape(key)}</a> (stored without extraction)</p>'
                       for key, asset in manifest.get("archives", {}).items())
    failures = manifest.get("failed_assets", [])
    warnings = ("<section><h2>Unavailable assets / recovery report</h2><ul>" + "".join(
        f'<li>{html.escape(asset["key"])}: {html.escape(asset["error"])}'
        + (f' — recovered from supplied archive as {html.escape(asset["recovered_path"])}' if asset.get("recovered_path") else ' — unavailable')
        + '</li>' for asset in failures
    ) + "</ul></section>") if failures else ""
    visual_preview = (f'<p>Offline asset preview. Board squares use a neutral preview palette. Missing piece roles show their codes.</p>'
                      f'<div class="layout"><div class="board" role="img" aria-label="Starting chess position with imported pieces">{"".join(squares)}</div>'
                      f'<aside>{boards}</aside></div><p>Perspective board images may require a compatible renderer for piece placement.</p>') if pieces or boards else ""
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{name} — CHESSNITE skin preview</title><link rel="stylesheet" href="theme.css">
<style>
* {{ box-sizing: border-box; }}
body {{ margin: 0; padding: 24px; background: #171b22; color: #eef2f7; font: 16px system-ui, sans-serif; }}
main {{ max-width: 1080px; margin: auto; }} h1 {{ margin-top: 0; }} p {{ line-height: 1.6; color: #c3ccd9; }}
.layout {{ display: flex; gap: 32px; flex-wrap: wrap; align-items: start; }}
.board {{ display: grid; grid-template-columns: repeat(8, 1fr); width: min(90vw, 560px); aspect-ratio: 1; }}
.square {{ position: relative; display: grid; place-items: center; min-width: 0; }}
.light {{ background: #e8dfcc; }} .dark {{ background: #718475; }}
.square img {{ width: 100%; height: 100%; object-fit: contain; position: absolute; }}
.missing {{ color: #111; font-size: 12px; }} figure {{ margin: 0 0 24px; max-width: 400px; }}
figcaption {{ margin-bottom: 12px; }} .board-image {{ max-width: 100%; height: auto; }}
code {{ background: #29313e; padding: 2px 5px; border-radius: 4px; }}
a {{ color: #9dccff; }} .sounds {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }}
.sound {{ padding: 16px; border-radius: 8px; background: #232b36; }} .sound h3 {{ margin-top: 0; }} audio {{ width: 100%; }}
</style></head><body><main><h1>{name}</h1>
{warnings}{visual_preview}{sounds}{archives}
<p>Load <code>manifest.json</code> for asset roles and provenance, or <code>theme.css</code> for local CSS variables.</p>
</main></body></html>'''


def import_skin(text: str, name: str, output: Path, timeout: float = 30,
                require_complete: bool = False, progress=print, skip_failed: bool = False,
                archive_fallback: bool = False, cancelled=None) -> Path:
    def check_cancelled():
        if cancelled is not None and cancelled():
            raise ImportCancelled("Import cancelled. No incomplete pack was saved.")

    check_cancelled()
    if archive_fallback and not skip_failed:
        raise ImportFailure("--archive-fallback requires --skip-failed.")
    assets, perspective = parse_skin(text)
    name = name.strip()
    if not name:
        raise ImportFailure("Give the skin a nonempty name.")
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80].rstrip("-")
    if not slug:
        raise ImportFailure("The skin name must contain at least one ASCII letter or digit.")
    # Avoid Windows reserved device names in portable pack directories.
    if slug in {"con", "prn", "aux", "nul", *(f"com{i}" for i in range(1, 10)), *(f"lpt{i}" for i in range(1, 10))}:
        slug = "skin-" + slug
    missing = sorted(set(PIECE_CODES) - assets.keys())
    if require_complete and missing:
        raise ImportFailure("Incomplete piece set; missing: " + ", ".join(missing))

    output = output.resolve()
    destination = output / slug
    if destination.exists():
        raise ImportFailure(f"Skin already exists: {destination}. Choose a different --name; existing packs are never overwritten.")
    output.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".skin-import-", dir=output))
    try:
        manifest = {
            "schema_version": 2, "id": slug, "name": name,
            "imported_at": datetime.now(timezone.utc).isoformat(),
            "piece_perspective": perspective,
            "complete_piece_set": not missing, "missing_pieces": missing,
            "pieces": {}, "boards": {}, "sounds": {}, "archives": {},
            "complete_import": True, "failed_assets": [],
        }
        css_lines = ["/* CHESSNITE theme: all asset paths are local to this file. */", ":root {"]
        if perspective is not None:
            css_lines.append(f"  --theme-piece-set-perspective: {perspective:g};")
        for index, (key, (prop, url)) in enumerate(assets.items(), 1):
            check_cancelled()
            progress(f"[{index}/{len(assets)}] Downloading {key}...")
            try:
                data, final_url = download_asset(url, timeout)
                extension, media_type = asset_format(key, data)
            except ImportFailure as exc:
                if not skip_failed:
                    raise
                manifest["failed_assets"].append({"key": key, "css_property": prop, "source_url": url, "error": str(exc)})
                progress(f"  Unavailable: {exc}")
                continue
            check_cancelled()
            sound = key.startswith("sound-")
            if sound:
                sound_type, event = key.removeprefix("sound-").split("-", 1)
                category = "archives" if event == "_archive" else "sounds"
                relative_path = f"{category}/{event}{extension}" if category == "sounds" else f"archives/{sound_type}-archive.zip"
            else:
                category = "pieces" if key in PIECE_CODES else "boards"
                relative_path = f"{category}/{key}{extension}"
            target = stage / relative_path
            target.parent.mkdir(exist_ok=True)
            target.write_bytes(data)
            metadata = {
                "path": relative_path, "css_property": prop,
                "source_url": url, "resolved_url": final_url,
                "media_type": media_type, "bytes": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
            if category == "sounds":
                manifest["sounds"].setdefault(event, {})[sound_type] = metadata
            else:
                manifest[category][key] = metadata
            css_lines.append(f"  {prop}: url('./{relative_path}');")
        if not any(manifest[category] for category in ("pieces", "boards", "sounds", "archives")):
            raise ImportFailure("No assets could be downloaded; no pack was published.")
        check_cancelled()
        if archive_fallback:
            recover_archive_sounds(stage, manifest, progress)
            for failure in manifest["failed_assets"]:
                if failure.get("recovered_path"):
                    css_lines.append(f"  {failure['css_property']}: url('./{failure['recovered_path']}');")
        manifest["complete_import"] = not any(not failure.get("recovered_path") for failure in manifest["failed_assets"])
        manifest["missing_pieces"] = sorted(set(PIECE_CODES) - manifest["pieces"].keys())
        manifest["complete_piece_set"] = not manifest["missing_pieces"]
        if require_complete and not manifest["complete_piece_set"]:
            raise ImportFailure("Required piece set could not be fully downloaded; no pack was published.")
        css_lines.append("}")
        (stage / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        (stage / "theme.css").write_text("\n".join(css_lines) + "\n", encoding="utf-8")
        (stage / "preview.html").write_text(preview_html(manifest), encoding="utf-8")
        # Publish only after every asset and metadata file has been written.
        check_cancelled()
        if destination.exists():
            raise ImportFailure(f"Skin already exists: {destination}")
        stage.rename(destination)
    finally:
        if stage.exists():
            shutil.rmtree(stage)
    return destination


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", "-i", required=True, help="UTF-8 CSS/text file, or - to read stdin")
    parser.add_argument("--name", "-n", required=True, help="Display name; also determines the unique pack directory")
    parser.add_argument("--output", "-o", type=Path, default=PROJECT_ROOT / "assets" / "skins", help="Pack parent directory (default: project assets/skins)")
    parser.add_argument("--timeout", type=float, default=30, help="Network socket timeout in seconds (default: 30)")
    parser.add_argument("--require-complete", action="store_true", help="Require all 12 piece roles before downloading")
    parser.add_argument("--skip-failed", action="store_true", help="Save available assets and report failures (exit code 2 for a partial import)")
    parser.add_argument("--archive-fallback", action="store_true", help="Recover missing sounds from uniquely matched supplied ZIP members; requires --skip-failed")
    args = parser.parse_args(argv)
    try:
        if not 0 < args.timeout <= 300:
            raise ImportFailure("Timeout must be between 0 and 300 seconds.")
        if args.input == "-":
            text = sys.stdin.read(MAX_INPUT_BYTES + 1)
            if len(text.encode("utf-8")) > MAX_INPUT_BYTES:
                raise ImportFailure("Input exceeds the 1 MB limit.")
        else:
            with Path(args.input).open("rb") as stream:
                raw = stream.read(MAX_INPUT_BYTES + 1)
            if len(raw) > MAX_INPUT_BYTES:
                raise ImportFailure("Input exceeds the 1 MB limit.")
            text = raw.decode("utf-8-sig")
        destination = import_skin(text, args.name, args.output, args.timeout, args.require_complete,
                                  skip_failed=args.skip_failed, archive_fallback=args.archive_fallback)
    except (ImportFailure, OSError, UnicodeError) as exc:
        print(f"Import failed: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nImport cancelled; no incomplete pack was published.", file=sys.stderr)
        return 130
    print(f"\nSaved skin: {destination}\nPreview: {destination / 'preview.html'}")
    manifest = json.loads((destination / "manifest.json").read_text(encoding="utf-8"))
    recovered = sum(bool(asset.get("recovered_path")) for asset in manifest["failed_assets"])
    if recovered:
        print(f"Recovered {recovered} sounds from the supplied archive; provenance is recorded in manifest.json.")
    if not manifest["complete_import"]:
        print(f"Partial import: {len(manifest['failed_assets']) - recovered} unavailable assets. See manifest.json and the preview.")
        return 2
    return 0


if __name__ == "__main__":
    if len(sys.argv) == 1 or sys.argv[1:] == ["--gui"]:
        from skin_importer_gui import main as gui_main
        raise SystemExit(gui_main())
    raise SystemExit(main())
