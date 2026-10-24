"""Utilitas filesystem lintas-platform (Windows & Linux).

Fungsi kunci: safe_path() memetakan path URL ke filesystem tanpa pernah
lolos dari root, di OS mana pun.
"""
from __future__ import annotations

import os
import urllib.parse


def _contains(root_abs: str, full_abs: str) -> bool:
    """True bila full_abs berada di dalam root_abs (perbandingan case-aware per OS).

    os.path.normcase di Windows me-lowercase + menyeragamkan separator,
    di Linux no-op — jadi satu kode aman di kedua OS.
    """
    r = os.path.normcase(root_abs)
    f = os.path.normcase(full_abs)
    return f == r or f.startswith(r + os.sep)


def safe_path(root: str, url_path: str) -> str | None:
    """Petakan URL ke path absolut di dalam root.

    Kembalikan None bila path lolos dari root (path traversal).
    Implementasi tidak memakai os.path.normpath pada string URL
    (hasilnya beda di Windows vs Linux), melainkan memecah segmen
    URL secara manual lalu menggabungkan dengan os.path.join —
    sehingga perilakunya identik di semua OS.
    """
    raw = urllib.parse.unquote(url_path.split("?", 1)[0]).replace("\\", "/")
    stack: list[str] = []
    for seg in raw.split("/"):
        if seg in ("", "."):
            continue
        if seg == "..":
            if stack:
                stack.pop()  # ".." hanya menghapus segmen sebelumnya, tak pernah lolos root
            continue
        if "\x00" in seg:
            return None
        stack.append(seg)
    root_abs = os.path.abspath(root)
    full = os.path.abspath(os.path.join(root_abs, *stack)) if stack else root_abs
    if not _contains(root_abs, full):
        return None
    return full


def fmt_size(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def dir_json(full: str) -> list[dict]:
    """Listing isi direktori sebagai list dict (name/type/size/mtime)."""
    try:
        entries = sorted(
            os.listdir(full),
            key=lambda x: (not os.path.isdir(os.path.join(full, x)), x.lower()),
        )
    except OSError:
        return []
    out = []
    for e in entries:
        p = os.path.join(full, e)
        try:
            st = os.stat(p)
        except OSError:
            continue
        out.append({
            "name": e,
            "type": "dir" if os.path.isdir(p) else "file",
            "size": st.st_size,
            "mtime": st.st_mtime,
        })
    return out
