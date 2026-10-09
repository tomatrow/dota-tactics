"""Find the installed Dota 2 map VPK through Steam's library folders."""

from __future__ import annotations

import re
from pathlib import Path

DOTA_MAP = Path("steamapps/common/dota 2 beta/game/dota/maps/dota.vpk")
_PATH_ENTRY = re.compile(r'"path"\s+"((?:[^"\\]|\\.)*)"')


def steam_roots() -> list[Path]:
    home = Path.home()
    return [
        home / "Library/Application Support/Steam",
        home / ".local/share/Steam",
        home / ".steam/steam",
        Path("C:/Program Files (x86)/Steam"),
    ]


def library_folders(root: Path) -> list[Path]:
    """The Steam root plus every library listed in its libraryfolders.vdf."""
    folders = [root]
    vdf = root / "steamapps/libraryfolders.vdf"
    if vdf.is_file():
        for raw in _PATH_ENTRY.findall(vdf.read_text(encoding="utf-8", errors="replace")):
            folders.append(Path(raw.replace("\\\\", "\\")))
    return list(dict.fromkeys(folders))


def find_dota_vpk(roots: list[Path] | None = None) -> Path:
    tried: list[Path] = []
    for root in roots if roots is not None else steam_roots():
        for library in library_folders(root):
            candidate = library / DOTA_MAP
            if candidate.is_file():
                return candidate
            tried.append(candidate)
    listed = "\n  ".join(str(p) for p in dict.fromkeys(tried))
    raise FileNotFoundError(f"dota.vpk not found in any Steam library; pass --vpk. Tried:\n  {listed}")
