"""HTTP handler: baca/tulis file + API + serve UI statis.

Dibuat lewat create_handler() supaya root/token/static_dir terikat ke
instance handler, bukan global modul — lebih gampang di-test & dirawat.
"""
from __future__ import annotations

import html
import json
import mimetypes
import os
import re
import shutil
import urllib.parse
from http.server import BaseHTTPRequestHandler

try:
    from fsutil import dir_json, fmt_size, safe_path
except ImportError:  # dijalankan sebagai paket (python -m ...) di OS mana pun
    from .fsutil import dir_json, fmt_size, safe_path

STATIC_MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".webp": "image/webp",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


def create_handler(config, static_dir):
    """Bikin kelas Handler yang terikat ke config + folder static/."""

    class Handler(BaseHTTPRequestHandler):
        server_version = "jetdrop/1.0"
        ROOT = config.root
        TOKEN = config.token
        STATIC_DIR = static_dir

        # ---------- helpers ----------
        def _token_ok(self):
            if not self.TOKEN:
                return True
            q = urllib.parse.urlparse(self.path).query
            if urllib.parse.parse_qs(q).get("token", [""])[0] == self.TOKEN:
                return True
            return self.headers.get("Authorization") == f"Bearer {self.TOKEN}"

        def _deny(self):
            self.send_response(401)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"butuh token yang valid\n")

        def _send(self, code, body=b"", ctype="text/plain; charset=utf-8"):
            if isinstance(body, str):
                body = body.encode()
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if body:
                self.wfile.write(body)

        def _send_json(self, obj, code=200):
            self._send(code, json.dumps(obj), "application/json")

        def _under_static(self, rel):
            base = os.path.abspath(self.STATIC_DIR)
            full = os.path.abspath(os.path.join(base, rel))
            # normcase: perbandingan kebal case di Windows, ketat di Linux.
            nb, nf = os.path.normcase(base), os.path.normcase(full)
            if nf != nb and not nf.startswith(nb + os.sep):
                return None
            return full

        def _serve_ui(self):
            try:
                with open(os.path.join(self.STATIC_DIR, "index.html"), "rb") as f:
                    return self._send(200, f.read(), "text/html; charset=utf-8")
            except OSError:
                return self._send(500, b"index.html tidak ditemukan di folder static/\n")

        def _serve_static(self, url_path):
            path = urllib.parse.unquote(url_path.split("?", 1)[0])
            if path == "/static":
                return self._send(404, b"tidak ditemukan\n")
            full = self._under_static(path[len("/static/"):])
            if full is None or not os.path.isfile(full):
                return self._send(404, b"tidak ditemukan\n")
            ctype = STATIC_MIME.get(os.path.splitext(full)[1].lower())
            if ctype is None:
                ctype, _ = mimetypes.guess_type(full)
                ctype = ctype or "application/octet-stream"
            try:
                with open(full, "rb") as f:
                    return self._send(200, f.read(), ctype)
            except OSError:
                return self._send(403, b"tidak bisa dibaca\n")

        # ---------------- read ----------------
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)
            # UI utama
            if parsed.path == "/" and "format" not in qs:
                return self._serve_ui()
            # aset statis (css/js)
            if parsed.path == "/static" or parsed.path.startswith("/static/"):
                return self._serve_static(parsed.path)
            full = safe_path(self.ROOT, self.path)
            if full is None:
                return self._send(403, b"path tidak valid\n")
            if os.path.isdir(full):
                if qs.get("format") == ["json"] or "application/json" in self.headers.get("Accept", ""):
                    return self._send_json(dir_json(full))
                # fallback listing HTML sederhana (untuk curl)
                rows = ""
                for it in dir_json(full):
                    href = urllib.parse.quote(it["name"]) + ("/" if it["type"] == "dir" else "")
                    rows += (f'<tr><td><a href="{href}">{"📁" if it["type"]=="dir" else "📄"} '
                             f'{html.escape(it["name"])}</a></td><td>{fmt_size(it["size"])}</td></tr>')
                page = (f'<!DOCTYPE html><html><head><meta charset="utf-8"><title>{html.escape(parsed.path)}'
                        f'</title></head><body><h2>{html.escape(parsed.path)}</h2>'
                        f'<table>{rows}</table><p><a href="/">⚡ buka jetdrop</a></p></body></html>')
                return self._send(200, page.encode(), "text/html; charset=utf-8")
            if os.path.isfile(full):
                ctype, _ = mimetypes.guess_type(full)
                try:
                    with open(full, "rb") as f:
                        data = f.read()
                except OSError:
                    return self._send(403, b"tidak bisa dibaca\n")
                return self._send(200, data, ctype or "application/octet-stream")
            return self._send(404, b"tidak ditemukan\n")

        # ---------------- write ----------------
        def do_PUT(self):
            if not self._token_ok():
                return self._deny()
            full = safe_path(self.ROOT, self.path)
            if full is None or os.path.isdir(full):
                return self._send(400, b"path tidak valid\n")
            length = int(self.headers.get("Content-Length", 0))
            try:
                os.makedirs(os.path.dirname(full), exist_ok=True)
                with open(full, "wb") as f:
                    f.write(self.rfile.read(length))
            except OSError as e:
                return self._send(500, f"gagal tulis: {e}\n".encode())
            return self._send(200, f"ok, {length} byte -> {self.path}\n")

        def do_DELETE(self):
            if not self._token_ok():
                return self._deny()
            full = safe_path(self.ROOT, self.path)
            if full is None or os.path.normcase(full) == os.path.normcase(os.path.abspath(self.ROOT)):
                return self._send(400, b"path tidak valid\n")
            try:
                if os.path.isdir(full):
                    shutil.rmtree(full)
                elif os.path.isfile(full):
                    os.remove(full)
                else:
                    return self._send(404, b"tidak ditemukan\n")
            except OSError as e:
                return self._send(500, f"gagal hapus: {e}\n".encode())
            return self._send(200, b"ok, dihapus\n")

        def _read_json_body(self):
            try:
                return json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            except Exception:
                return None

        def do_POST(self):
            parsed = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(parsed.query)

            if parsed.path == "/api/mkdir":
                if not self._token_ok():
                    return self._deny()
                data = self._read_json_body()
                if data is None:
                    return self._send(400, b"json tidak valid\n")
                full = safe_path(self.ROOT, "/" + (data.get("path") or "").strip("/"))
                if full is None:
                    return self._send(400, b"path tidak valid\n")
                try:
                    os.makedirs(full, exist_ok=True)
                except OSError as e:
                    return self._send(500, f"gagal: {e}\n".encode())
                return self._send_json({"ok": True, "path": data.get("path")})

            if parsed.path == "/api/move":
                if not self._token_ok():
                    return self._deny()
                data = self._read_json_body()
                if data is None:
                    return self._send(400, b"json tidak valid\n")
                src = safe_path(self.ROOT, "/" + (data.get("from") or "").strip("/"))
                dst = safe_path(self.ROOT, "/" + (data.get("to") or "").strip("/"))
                if not src or not dst or not os.path.exists(src):
                    return self._send(400, b"path tidak valid\n")
                try:
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    shutil.move(src, dst)
                except OSError as e:
                    return self._send(500, f"gagal: {e}\n".encode())
                return self._send_json({"ok": True})

            if parsed.path == "/api/copy":
                if not self._token_ok():
                    return self._deny()
                data = self._read_json_body()
                if data is None:
                    return self._send(400, b"json tidak valid\n")
                src = safe_path(self.ROOT, "/" + (data.get("from") or "").strip("/"))
                dst = safe_path(self.ROOT, "/" + (data.get("to") or "").strip("/"))
                if not src or not dst or not os.path.exists(src):
                    return self._send(400, b"path tidak valid\n")
                try:
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    if os.path.isdir(src):
                        shutil.copytree(src, dst)
                    else:
                        shutil.copy2(src, dst)
                except OSError as e:
                    return self._send(500, f"gagal: {e}\n".encode())
                return self._send_json({"ok": True})

            if parsed.path == "/upload":
                if not self._token_ok():
                    return self._deny()
                dest = safe_path(self.ROOT, qs.get("path", ["/"])[0] or "/")
                if dest is None or not os.path.isdir(dest):
                    return self._send(400, b"folder tujuan tidak valid\n")
                ctype = self.headers.get("Content-Type", "")
                if "multipart/form-data" not in ctype or "boundary=" not in ctype:
                    return self._send(400, b"harus multipart/form-data\n")
                boundary = ctype.split("boundary=")[1].encode()
                body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
                m = re.search(rb'filename="([^"]+)"', body)
                if not m:
                    return self._send(400, b"tidak ada file\n")
                fname = os.path.basename(m.group(1).decode("utf-8", "replace"))
                payload = b""
                for p in body.split(boundary):
                    if b"filename=" in p and b"\r\n\r\n" in p:
                        payload = p.split(b"\r\n\r\n", 1)[1].rsplit(b"\r\n", 1)[0]
                        break
                target = safe_path(self.ROOT, "/" + (qs.get("path", ["/"])[0] or "/").strip("/") + "/" + fname)
                if target is None:
                    return self._send(400, b"nama file tidak valid\n")
                try:
                    with open(target, "wb") as f:
                        f.write(payload)
                except OSError as e:
                    return self._send(500, f"gagal tulis: {e}\n".encode())
                return self._send_json({"ok": True, "file": fname})

            return self._send(404, b"tidak ditemukan\n")

        def log_message(self, fmt, *a):
            print(f"[{self.log_date_time_string()}] {self.command} {self.path} -> {fmt % a}")

    return Handler
