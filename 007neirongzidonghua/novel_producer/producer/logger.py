from __future__ import annotations

import sys


RESET = "\033[0m"
BG_BLACK = "\033[40m"
FG_GREEN = "\033[92m"
FG_YELLOW = "\033[93m"
FG_RED = "\033[91m"


def _emit(message: str, color: str) -> None:
    sys.stdout.write(f"{BG_BLACK}{color}{message}{RESET}\n")
    sys.stdout.flush()


def info(message: str) -> None:
    _emit(message, FG_GREEN)


def warn(message: str) -> None:
    _emit(message, FG_YELLOW)


def error(message: str) -> None:
    _emit(message, FG_RED)

