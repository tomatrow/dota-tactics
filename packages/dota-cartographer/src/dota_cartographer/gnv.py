"""Dota GridNav (`maps/<map>.gnv`): the engine's static walkability grid.

Layout (little-endian), as in ValveResourceFormat's `GridNavFile.cs`:

    u32  magic 0xFADEBEAD
    f32  edge size: game units per cell (64)
    f32  offset x, f32 offset y: a cell's centre relative to its south-west corner (edge / 2)
    i32  width, i32 height: cells
    i32  min x, i32 min y: world cell index of the first column / row
    u8   flags[width * height], row-major, row 0 = south

Cell (col, row) covers world x in [(min_x + col) * edge, (min_x + col + 1) * edge), likewise y. Matching
blocked cells against the physics mesh's slopes confirms this alignment, rather than cells centred on
multiples of the edge size.

GridNav is static terrain only: buildings and trees stand on traversable cells and block at runtime.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass
from enum import IntFlag
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

MAGIC = 0xFADEBEAD
_HEADER = struct.Struct("<Ifffiiii")


class GnvFlag(IntFlag):
    TRAVERSABLE = 0x01
    BLOCKED = 0x02
    HERO_BLOCKING = 0x04
    CREATURE_BLOCKING = 0x08
    WARD_BLOCKING = 0x10


@dataclass(frozen=True)
class GridNav:
    edge: int
    offset: tuple[float, float]
    min_cell: tuple[int, int]
    cells: NDArray[np.uint8]  # (height, width), row 0 = south

    @property
    def width(self) -> int:
        return int(self.cells.shape[1])

    @property
    def height(self) -> int:
        return int(self.cells.shape[0])

    def crop(self, col0: int, row0: int, cols: int, rows: int) -> NDArray[np.uint8]:
        """Flags for a window whose south-west cell has world cell index (col0, row0).

        Cells outside the file come back as 0 (empty, not traversable).
        """
        out = np.zeros((rows, cols), np.uint8)
        sx, sy = col0 - self.min_cell[0], row0 - self.min_cell[1]
        x0, x1 = max(0, sx), min(self.width, sx + cols)
        y0, y1 = max(0, sy), min(self.height, sy + rows)
        if x0 < x1 and y0 < y1:
            out[y0 - sy : y1 - sy, x0 - sx : x1 - sx] = self.cells[y0:y1, x0:x1]
        return out

    def traversable_bounds(self) -> tuple[tuple[int, int], tuple[int, int]] | None:
        """World-unit bounding box (min, max) of all traversable cells, or None if there are none."""
        rows, cols = np.nonzero(self.cells & GnvFlag.TRAVERSABLE)
        if rows.size == 0:
            return None
        mx, my = self.min_cell
        lo = ((int(cols.min()) + mx) * self.edge, (int(rows.min()) + my) * self.edge)
        hi = ((int(cols.max()) + mx + 1) * self.edge, (int(rows.max()) + my + 1) * self.edge)
        return lo, hi


def parse(data: bytes) -> GridNav:
    if len(data) < _HEADER.size:
        raise ValueError(f"GridNav file is {len(data)} bytes, shorter than its {_HEADER.size}-byte header")
    magic, edge, off_x, off_y, width, height, min_x, min_y = _HEADER.unpack_from(data)
    if magic != MAGIC:
        raise ValueError(f"not a GridNav file: magic {magic:#010x}, expected {MAGIC:#010x}")
    if edge <= 0 or edge != int(edge):
        raise ValueError(f"GridNav edge size {edge} is not a positive whole number of units")
    if width <= 0 or height <= 0:
        raise ValueError(f"GridNav size {width}x{height} is empty")
    expected = _HEADER.size + width * height
    if len(data) != expected:
        raise ValueError(f"GridNav {width}x{height} needs {expected} bytes, file has {len(data)}")
    cells = np.frombuffer(data, np.uint8, count=width * height, offset=_HEADER.size).reshape(height, width)
    return GridNav(int(edge), (off_x, off_y), (min_x, min_y), cells.copy())


def read(path: Path) -> GridNav:
    return parse(path.read_bytes())
