"""Unit test lintas-platform untuk fsutil.safe_path (stdlib saja).

Jalan di Windows & Linux:
    python -m unittest discover -s tests -v
"""
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fsutil import safe_path


class SafePathTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = os.path.abspath(self.tmp.name)
        os.makedirs(os.path.join(self.root, "sub"), exist_ok=True)

    def tearDown(self):
        self.tmp.cleanup()

    def test_root_sendiri(self):
        self.assertEqual(safe_path(self.root, "/"), self.root)
        self.assertEqual(safe_path(self.root, "/?format=json"), self.root)

    def test_file_dalam_root(self):
        got = safe_path(self.root, "/sub/b.txt")
        self.assertEqual(got, os.path.abspath(os.path.join(self.root, "sub", "b.txt")))

    def test_traversal_tidak_lolos(self):
        for evil in ("/../secret", "/sub/../../secret", "/..%2f..%2fetc/passwd",
                     "/sub/..%5c..%5csecret"):
            got = safe_path(self.root, evil)
            self.assertTrue(got is None or got.startswith(self.root),
                            f"{evil} -> {got}")

    def test_backslash_tidak_lolos(self):
        got = safe_path(self.root, "/sub\\..\\..\\secret")
        self.assertTrue(got is None or got.startswith(self.root))


if __name__ == "__main__":
    unittest.main()
