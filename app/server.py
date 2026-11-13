"""Loopback-only application host. No IDE or Node runtime is needed to use a build."""
import json
import mimetypes
import os
import secrets
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from store import Conflict, Store
from updater import Updater

ROOT = Path(__file__).resolve().parent.parent
PORT = 8765


class AppServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, port=PORT, data_path=None):
        super().__init__(("127.0.0.1", port), Handler)
        self.key = secrets.token_urlsafe(32)
        self.boot_id = secrets.token_hex(8)
        self.store = Store(data_path or ROOT / ".local" / "chessnite.sqlite3")
        self.updater = Updater(ROOT)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def respond(self, status, value):
        data = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def allowed_host(self):
        return self.headers.get("Host") in (f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}")

    def do_GET(self):
        if not self.allowed_host():
            return self.respond(403, {"error": "Use the local CHESSNITE address."})
        path = unquote(urlsplit(self.path).path)
        if path == "/api/health":
            return self.respond(200, {"app": "chessnite", "version": "0.1.0", "bootId": self.server.boot_id, "pid": os.getpid()})
        if path == "/api/update":
            return self.respond(200, self.server.updater.read())
        if path == "/api/state":
            return self.respond(200, {**self.server.store.read(), "key": self.server.key})
        if path == "/api/skins":
            packs = []
            for file in sorted((ROOT / "assets" / "skins").glob("*/manifest.json")):
                try:
                    pack = json.loads(file.read_text(encoding="utf-8"))
                    if pack.get("schema_version") in (1, 2):
                        packs.append({**pack, "baseUrl": f"/skins/{file.parent.name}/"})
                except (OSError, ValueError):
                    continue
            return self.respond(200, packs)
        if path.startswith("/api/"):
            return self.respond(404, {"error": "Unknown action."})
        base = ROOT / ("assets/skins" if path.startswith("/skins/") else "web/build")
        relative = path.removeprefix("/skins/") if path.startswith("/skins/") else path.lstrip("/") or "index.html"
        target = (base / relative).resolve()
        if not target.is_relative_to(base.resolve()) or not target.is_file():
            return self.respond(404, {"error": "File not found. Build the application first."})
        data = target.read_bytes()
        self.send_response(200)
        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if target.suffix == ".js":
            content_type = "application/javascript"
        if target.suffix == ".wasm":
            content_type = "application/wasm"
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=31536000, immutable" if path.startswith("/assets/") else "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if not self.allowed_host() or self.headers.get("X-Chessnite-Key") != self.server.key:
            return self.respond(403, {"error": "Reload CHESSNITE before saving."})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 1_100_000:
                return self.respond(413, {"error": "Request is too large or empty."})
            body = json.loads(self.rfile.read(length))
            if self.path == "/api/update":
                return self.respond(202, self.server.updater.start())
            if self.path == "/api/quit":
                self.respond(200, {"stopped": True})
                threading.Timer(.2, self.server.shutdown).start()
                return
            if self.path == "/api/restart":
                if self.server.server_port != PORT:
                    return self.respond(400, {"error": "Restart is only available in the personal app instance."})
                subprocess.Popen([sys.executable, str(ROOT / 'app/launcher.py'), '--wait', '--no-browser'],
                                 creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                self.respond(200, {"restarting": True, "bootId": self.server.boot_id})
                threading.Timer(.3, self.server.shutdown).start()
                return
            if self.path == "/api/state":
                revision = self.server.store.save(body["state"], body["revision"])
                return self.respond(200, {"revision": revision})
            return self.respond(404, {"error": "Unknown action."})
        except Conflict as exc:
            self.respond(409, {"error": str(exc)})
        except (ValueError, KeyError, TypeError) as exc:
            self.respond(400, {"error": str(exc)})


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=PORT)
    parser.add_argument('--data-path')
    args = parser.parse_args()
    server = AppServer(args.port, args.data_path)
    try:
        server.serve_forever()
    finally:
        server.server_close()
