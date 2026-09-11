"""Ensures the ``app`` package (backend/app) is importable regardless of
which directory pytest is invoked from."""
import pathlib
import sys

BACKEND_DIR = pathlib.Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
