# jetdrop — lightweight remote editor

Edit file di server remote lewat browser (UI ala VS Code) atau via API.
Satu perintah yang sama jalan di **Windows** maupun **Linux**.
Hanya butuh Python 3.8+ (stdlib saja, tanpa dependensi).

## Struktur

```
main.py        # entry point (python main.py ...)
config.py      # CLI + env (RW_ROOT/RW_HOST/RW_PORT/RW_TOKEN)
fsutil.py      # path aman lintas-OS, listing direktori
handlers.py    # HTTP handler (GET/PUT/DELETE/POST, serve UI)
static/        # UI: index.html, styles.css, app.js (Monaco via CDN)
tests/         # unit test: python -m unittest discover -s tests -v
```

## Jalankan

Windows (PowerShell / cmd):

```powershell
python main.py --root . --port 8080 --token RAHASIA_KAMU
```

Linux / macOS:

```bash
python3 main.py --root . --port 8080 --token RAHASIA_KAMU
```

Atau pakai environment (sama di kedua OS):

```bash
RW_ROOT=/path/ke/folder RW_PORT=8080 RW_TOKEN=RAHASIA_KAMU python3 main.py
```

Buka `http://localhost:8080/`.

## API

| Method | Endpoint | Keterangan |
| ------ | -------- | ---------- |
| GET | `/<path>/?format=json` | listing direktori (JSON) |
| GET | `/<path>/file` | download file |
| PUT | `/<path>/file` | tulis/timpa (butuh token) |
| DELETE | `/<path>` | hapus (butuh token) |
| POST | `/upload?path=/dir` | upload multipart (butuh token) |
| POST | `/api/mkdir` `{"path":"/dir"}` | bikin folder (butuh token) |
| POST | `/api/move` `{"from":"/a","to":"/b"}` | pindah/rename (butuh token) |
| POST | `/api/copy` `{"from":"/a","to":"/b"}` | copy (butuh token) |

Token via header `Authorization: Bearer <token>` atau query `?token=<token>`.

## Catatan lintas-platform

- `--root` default = folder kerja saat ini (`.`), jadi tak ada path khusus
  WSL/Linux (`/mnt/...`) yang rusak di Windows.
- `safe_path()` di `fsutil.py` memecah segmen URL secara manual (bukan
  `os.path.normpath` pada string URL), sehingga proteksi path-traversal
  identik di Windows & Linux.
- Tak ada dependensi; Monaco editor dimuat dari CDN saat UI dibuka
  (butuh internet sekali untuk itu).
