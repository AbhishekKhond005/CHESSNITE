import hashlib
import io
import json
import struct
import sys
import tempfile
import unittest
import zlib
import zipfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import import_skin as importer


def png_pixel():
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"\x00\xff\xff\xff\xff")) + chunk(b"IEND", b""))


class SkinImportTests(unittest.TestCase):
    def test_supplied_input_has_every_role_and_board(self):
        text = (Path(__file__).resolve().parents[1] / "examples/chesscom-ca09k.css").read_text()
        assets, perspective = importer.parse_skin(text)
        self.assertEqual(set(assets), set(importer.PIECE_CODES) | {"board-3d-board"})
        self.assertEqual(perspective, 1)

    def test_css_syntax_comments_and_url_query(self):
        assets, _ = importer.parse_skin('''
        /* --theme-piece-set-wp: url('https://old.example/wp.png'); */
        --theme-piece-set-wp: url("https://example.com/pawn?size=150&color=w");
        --theme-piece-set-bk: url(https://example.com/king.png);
        ''')
        self.assertEqual(len(assets), 2)
        self.assertIn("?size=150&color=w", assets["wp"][1])

    def test_plain_urls_use_roles_not_input_order(self):
        assets, _ = importer.parse_skin("https://example.com/bk.png\nhttps://example.com/wp.png?size=150")
        self.assertEqual(set(assets), {"bk", "wp"})

    def test_unsafe_or_unmapped_inputs_fail(self):
        for text in ["no urls", "https://example.com/unknown.png",
                     "--theme-piece-set-wp: url('http://example.com/wp.png');",
                     "--theme-piece-set-wp: url('https://user:secret@example.com/wp.png');",
                     "--theme-piece-set-perspective: NaN; https://example.com/wp.png"]:
            with self.subTest(text=text), self.assertRaises(importer.ImportFailure):
                importer.parse_skin(text)

    def test_conflicting_roles_fail(self):
        with self.assertRaises(importer.ImportFailure):
            importer.parse_skin("https://example.com/wp.png\nhttps://other.example/wp.png")

    def test_non_image_response_fails(self):
        with self.assertRaises(importer.ImportFailure):
            importer.image_format(b"<html>Access denied</html>")

    def test_portable_pack_and_no_overwrite(self):
        data = png_pixel()
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(importer, "download_asset", return_value=(data, "https://example.com/wp.png")):
                pack = importer.import_skin("https://example.com/wp.png", "Test <skin>", Path(directory), progress=lambda _: None)
            manifest = json.loads((pack / "manifest.json").read_text())
            asset = manifest["pieces"]["wp"]
            self.assertEqual((pack / asset["path"]).read_bytes(), data)
            self.assertEqual(asset["sha256"], hashlib.sha256(data).hexdigest())
            self.assertFalse(manifest["complete_piece_set"])
            self.assertEqual(len(manifest["missing_pieces"]), 11)
            css = (pack / "theme.css").read_text()
            self.assertIn("url('./pieces/wp.png')", css)
            self.assertNotIn("https://", css)
            preview = (pack / "preview.html").read_text(encoding="utf-8")
            self.assertIn("Test &lt;skin&gt;", preview)
            self.assertEqual(preview.count('class="square '), 64)
            with self.assertRaises(importer.ImportFailure):
                importer.import_skin("https://example.com/wp.png", "Test <skin>", Path(directory))

    def test_failed_download_leaves_no_partial_pack(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(importer, "download_asset", side_effect=[(png_pixel(), "https://example.com/wp.png"), importer.ImportFailure("HTTP 404")]):
                with self.assertRaises(importer.ImportFailure):
                    importer.import_skin("https://example.com/wp.png\nhttps://example.com/bk.png", "Failed", Path(directory), progress=lambda _: None)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_completeness_checked_before_any_download(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(importer, "download_asset") as download:
            with self.assertRaises(importer.ImportFailure):
                importer.import_skin("https://example.com/wp.png", "Incomplete", Path(directory), require_complete=True)
            download.assert_not_called()

    def test_board_only_and_reserved_directory_name(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(importer, "download_asset", return_value=(png_pixel(), "https://example.com/3dboard.png")):
                pack = importer.import_skin("https://example.com/3dboard.png", "CON", Path(directory), progress=lambda _: None)
            manifest = json.loads((pack / "manifest.json").read_text())
            self.assertEqual(pack.name, "skin-con")
            self.assertEqual(set(manifest["boards"]), {"board-3d-board"})
            self.assertEqual(manifest["pieces"], {})

    def test_empty_audio_alternatives_ignored_and_event_names_preserved(self):
        assets, _ = importer.parse_skin('''
        --theme-sound-set-mp3-move-self-check: url('https://example.com/check.mp3');
        --theme-sound-set-ogg-move-self-check: url('');
        --theme-sound-set-webm-move-self-check: url("");
        --theme-sound-set-wav-move-self-check: url( );
        --theme-sound-set-mp3-lesson_pass: url('https://example.com/pass.mp3');
        ''')
        self.assertEqual(set(assets), {"sound-mp3-move-self-check", "sound-mp3-lesson_pass"})

    def test_empty_only_input_fails(self):
        with self.assertRaises(importer.ImportFailure):
            importer.parse_skin("--theme-sound-set-mp3-capture: url('');")

    def test_audio_containers_and_format_mismatch(self):
        fixtures = {
            "mp3": b"\xff\xfb\x90\x00" + b"\x00" * 24,
            "ogg": b"OggS" + b"\x00" * 24 + b"OpusHead",
            "webm": b"\x1a\x45\xdf\xa3" + b"\x00webm\x00",
            "wav": b"RIFF" + b"\x24\x00\x00\x00" + b"WAVEfmt ",
        }
        for fmt, data in fixtures.items():
            with self.subTest(fmt=fmt):
                self.assertEqual(importer.asset_format(f"sound-{fmt}-draw-offer", data)[0], "." + fmt)
        for data in (b"<html>Denied</html>", png_pixel(), b"ID3" + b"\x00" * 7):
            with self.assertRaises(importer.ImportFailure):
                importer.asset_format("sound-mp3-move-self", data)
        with self.assertRaises(importer.ImportFailure):
            importer.asset_format("sound-mp3-move-self", fixtures["wav"])

    def test_sound_pack_variants_and_archive_not_extracted(self):
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, "w") as zipped:
            zipped.writestr("../../must-not-extract.txt", "source archive only")
        text = ("https://example.com/draw-offer.mp3\nhttps://example.com/draw-offer.wav\n"
                "https://example.com/_archive.zip")
        responses = [
            (b"\xff\xfb\x90\x00" + b"\x00" * 24, "https://example.com/draw-offer.mp3"),
            (b"RIFF\x24\x00\x00\x00WAVEfmt ", "https://example.com/draw-offer.wav"),
            (archive.getvalue(), "https://example.com/_archive.zip"),
        ]
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(importer, "download_asset", side_effect=responses):
                pack = importer.import_skin(text, "Sounds", Path(directory), progress=lambda _: None)
            manifest = json.loads((pack / "manifest.json").read_text())
            self.assertEqual(manifest["schema_version"], 2)
            self.assertEqual(set(manifest["sounds"]["draw-offer"]), {"mp3", "wav"})
            self.assertEqual((pack / "archives/mp3-archive.zip").read_bytes(), archive.getvalue())
            self.assertFalse((Path(directory).parent / "must-not-extract.txt").exists())
            preview = (pack / "preview.html").read_text(encoding="utf-8")
            self.assertIn('<audio controls preload="none">', preview)
            self.assertIn('sounds/draw-offer.mp3', preview)
            self.assertNotIn('class="board"', preview)
            self.assertNotIn("autoplay", preview)

    def test_mixed_piece_and_sound_pack(self):
        text = ("--theme-piece-set-wp: url('https://example.com/wp.png');"
                "--theme-sound-set-mp3-capture: url('https://example.com/capture.mp3');")
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(importer, "download_asset", side_effect=[
                (png_pixel(), "https://example.com/wp.png"),
                (b"\xff\xfb\x90\x00" + b"\x00" * 24, "https://example.com/capture.mp3"),
            ]):
                pack = importer.import_skin(text, "Mixed", Path(directory), progress=lambda _: None)
            manifest = json.loads((pack / "manifest.json").read_text())
            self.assertIn("wp", manifest["pieces"])
            self.assertIn("capture", manifest["sounds"])

    def test_audio_download_failure_is_transactional(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(importer, "download_asset", side_effect=[
                (b"\xff\xfb\x90\x00" + b"\x00" * 24, "https://example.com/capture.mp3"),
                (b"<html>Denied</html>", "https://example.com/move-self.mp3"),
            ]):
                with self.assertRaises(importer.ImportFailure):
                    importer.import_skin("https://example.com/capture.mp3\nhttps://example.com/move-self.mp3",
                                         "Broken sounds", Path(directory), progress=lambda _: None)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_opt_in_partial_import_reports_unavailable_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(importer, "download_asset", side_effect=[
                (b"\xff\xfb\x90\x00" + b"\x00" * 24, "https://example.com/capture.mp3"),
                importer.ImportFailure("HTTP 403"),
            ]):
                pack = importer.import_skin("https://example.com/capture.mp3\nhttps://example.com/draw-offer.mp3",
                                            "Partial", Path(directory), progress=lambda _: None, skip_failed=True)
            manifest = json.loads((pack / "manifest.json").read_text())
            self.assertFalse(manifest["complete_import"])
            self.assertEqual(set(manifest["sounds"]), {"capture"})
            self.assertEqual(manifest["failed_assets"][0]["key"], "sound-mp3-draw-offer")
            self.assertIn("Unavailable assets", (pack / "preview.html").read_text(encoding="utf-8"))
            self.assertNotIn("draw-offer", (pack / "theme.css").read_text())

    def test_skip_failed_does_not_publish_empty_pack_or_break_required_completeness(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(importer, "download_asset", side_effect=importer.ImportFailure("HTTP 403")):
                with self.assertRaises(importer.ImportFailure):
                    importer.import_skin("https://example.com/capture.mp3", "Empty", Path(directory),
                                         progress=lambda _: None, skip_failed=True)
            text = "\n".join(f"https://example.com/{code}.png" for code in importer.PIECE_CODES)
            responses = [(png_pixel(), "https://example.com/piece.png")] * 11 + [importer.ImportFailure("HTTP 403")]
            with patch.object(importer, "download_asset", side_effect=responses):
                with self.assertRaises(importer.ImportFailure):
                    importer.import_skin(text, "Required", Path(directory), require_complete=True,
                                         progress=lambda _: None, skip_failed=True)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_supplied_sound_css_counts(self):
        text = (Path(__file__).resolve().parents[1] / "examples/chesscom-sounds.css").read_text()
        assets, _ = importer.parse_skin(text)
        self.assertEqual(len(assets), 40)
        self.assertIn("sound-mp3-_archive", assets)
        self.assertIn("sound-mp3-lesson_pass", assets)
        for fmt in ("mp3", "ogg", "webm", "wav"):
            self.assertIn(f"sound-{fmt}-draw-offer", assets)

    def test_archive_fallback_matches_aliases_and_preserves_provenance(self):
        archive = io.BytesIO()
        audio = b"\xff\xfb\x90\x00" + b"\x00" * 24
        with zipfile.ZipFile(archive, "w") as zipped:
            zipped.writestr("standard/drawoffer.mp3", audio)
            zipped.writestr("standard/lesson-pass.mp3", audio)
        responses = [importer.ImportFailure("HTTP 403"), importer.ImportFailure("HTTP 403"),
                     (archive.getvalue(), "https://example.com/_archive.zip")]
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(importer, "download_asset", side_effect=responses):
                pack = importer.import_skin("https://example.com/draw-offer.mp3\nhttps://example.com/lesson_pass.mp3\nhttps://example.com/_archive.zip",
                                            "Recovered", Path(directory), progress=lambda _: None,
                                            skip_failed=True, archive_fallback=True)
            manifest = json.loads((pack / "manifest.json").read_text())
            self.assertTrue(manifest["complete_import"])
            self.assertEqual(set(manifest["sounds"]), {"draw-offer", "lesson_pass"})
            self.assertEqual(manifest["sounds"]["draw-offer"]["mp3"]["archive_member"], "standard/drawoffer.mp3")
            self.assertEqual(manifest["sounds"]["draw-offer"]["mp3"]["source_url"], "https://example.com/_archive.zip")
            self.assertIn("sounds/lesson_pass.mp3", (pack / "theme.css").read_text())

    def test_archive_fallback_rejects_ambiguous_and_traversal_members(self):
        archive = io.BytesIO()
        audio = b"\xff\xfb\x90\x00" + b"\x00" * 24
        with zipfile.ZipFile(archive, "w") as zipped:
            for name in ("one/capture.mp3", "two/capture.mp3", "../../draw-offer.mp3"):
                zipped.writestr(name, audio)
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(importer, "download_asset", side_effect=[
                importer.ImportFailure("HTTP 403"), importer.ImportFailure("HTTP 403"),
                (archive.getvalue(), "https://example.com/_archive.zip"),
            ]):
                pack = importer.import_skin("https://example.com/capture.mp3\nhttps://example.com/draw-offer.mp3\nhttps://example.com/_archive.zip",
                                            "Ambiguous", Path(directory), progress=lambda _: None,
                                            skip_failed=True, archive_fallback=True)
            manifest = json.loads((pack / "manifest.json").read_text())
            self.assertEqual(manifest["sounds"], {})
            self.assertFalse(manifest["complete_import"])

    def test_archive_fallback_requires_opt_in_partial_import(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(importer.ImportFailure):
                importer.import_skin("https://example.com/capture.mp3", "Invalid", Path(directory), archive_fallback=True)


if __name__ == "__main__":
    unittest.main()
