"""jetdrop — lightweight remote editor. Lintas-platform (Windows & Linux).

Cara pakai (perintah sama di kedua OS):
    python main.py --root . --port 8080 --token RAHASIA_KAMU

Semua opsi juga bisa lewat environment:
    RW_ROOT, RW_HOST, RW_PORT, RW_TOKEN
"""
import os
import sys
from http.server import ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:  # pastikan import saudara jalan apa pun cwd-nya
    sys.path.insert(0, BASE_DIR)

from config import load_config
from handlers import create_handler


def main(argv=None):
    config = load_config(argv)
    if not os.path.isdir(config.root):
        raise SystemExit(f"root tidak ada: {config.root}")
    handler = create_handler(config, os.path.join(BASE_DIR, "static"))
    # ThreadingHTTPServer + SO_REUSE_ADDRESS default: aman di Windows & Linux.
    srv = ThreadingHTTPServer((config.host, config.port), handler)
    print(f"jetdrop jalan di {config.host}:{config.port}, root={config.root}")
    print(f"  UI   : http://localhost:{config.port}/")
    print(f"  baca : curl http://localhost:{config.port}/<path>/?format=json")
    print(f"  tulis: curl -X PUT --data-binary @f -H 'Authorization: Bearer <token>' "
          f"http://localhost:{config.port}/<path>/f")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nberhenti.")


if __name__ == "__main__":
    main()
