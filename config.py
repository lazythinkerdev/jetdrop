"""Konfigurasi server: parsing argumen CLI + environment.

Lintas-platform (Windows & Linux):
  - default --root adalah folder kerja saat ini (cwd), bukan path WSL,
    jadi perintah yang sama jalan di kedua OS;
  - semua opsi juga bisa lewat env: RW_ROOT, RW_HOST, RW_PORT, RW_TOKEN.
"""
from __future__ import annotations

import argparse
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    root: str
    host: str
    port: int
    token: str


def resolve_root(raw: str | None) -> str:
    """Ubah input user (--root / RW_ROOT) jadi path absolut yang valid di OS ini.

    Mendukung "~", variabel env ($HOME / %USERPROFILE%), path relatif,
    dan path absolut Windows (D:\\...) maupun Linux (/...).
    """
    expanded = os.path.expanduser(os.path.expandvars((raw or ".").strip() or "."))
    return os.path.abspath(expanded)


def load_config(argv=None) -> Config:
    parser = argparse.ArgumentParser(description="jetdrop — lightweight remote editor")
    parser.add_argument("--root", default=os.environ.get("RW_ROOT", "."),
                        help="folder yang dilayani (default: folder kerja saat ini)")
    parser.add_argument("--host", default=os.environ.get("RW_HOST", "0.0.0.0"),
                        help="alamat bind (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=int(os.environ.get("RW_PORT", "8080")))
    parser.add_argument("--token", default=os.environ.get("RW_TOKEN", ""))
    args = parser.parse_args(argv)
    if not args.token:
        print("PERINGATAN: token kosong — operasi tulis terbuka untuk semua!")
    return Config(root=resolve_root(args.root), host=args.host,
                  port=args.port, token=args.token)
