"""The output grid: whole cells aligned to world multiples of the cell size, row 0 = south, col 0 = west."""

from __future__ import annotations

import math
from collections.abc import Iterable
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray


@dataclass(frozen=True)
class Grid:
    cell: int
    origin: tuple[int, int]  # world (x, y) of the south-west corner
    cols: int
    rows: int

    @classmethod
    def covering(cls, cell: int, lo: tuple[float, float], hi: tuple[float, float]) -> Grid:
        """The smallest cell-aligned grid containing the box lo..hi."""
        c0, r0 = math.floor(lo[0] / cell), math.floor(lo[1] / cell)
        c1, r1 = math.ceil(hi[0] / cell), math.ceil(hi[1] / cell)
        if c1 <= c0 or r1 <= r0:
            raise ValueError(f"bounds {lo}..{hi} are empty")
        return cls(cell, (c0 * cell, r0 * cell), c1 - c0, r1 - r0)

    @property
    def first_cell(self) -> tuple[int, int]:
        """World cell index (col, row) of the south-west cell."""
        return self.origin[0] // self.cell, self.origin[1] // self.cell

    def cell_of(self, x: float, y: float) -> tuple[int, int] | None:
        col = math.floor((x - self.origin[0]) / self.cell)
        row = math.floor((y - self.origin[1]) / self.cell)
        return (col, row) if 0 <= col < self.cols and 0 <= row < self.rows else None

    def centres(self) -> tuple[NDArray[np.float64], NDArray[np.float64]]:
        """World x of each column's centre and world y of each row's centre."""
        half = self.cell / 2
        xs = self.origin[0] + half + self.cell * np.arange(self.cols, dtype=np.float64)
        ys = self.origin[1] + half + self.cell * np.arange(self.rows, dtype=np.float64)
        return xs, ys


def tree_mask(grid: Grid, trees: Iterable[tuple[int, int]]) -> NDArray[np.bool_]:
    """Cells blocked by trees: the 2x2 cells around each tree, which sits on a grid corner.

    Dota lays trees out on 128-unit (2x2 cell) blocks around 64-unit grid corners; a tree that isn't on a
    corner is snapped to the nearest one.
    """
    mask = np.zeros((grid.rows, grid.cols), np.bool_)
    for x, y in trees:
        col = round((x - grid.origin[0]) / grid.cell)
        row = round((y - grid.origin[1]) / grid.cell)
        r0, r1 = max(0, row - 1), min(grid.rows, row + 1)
        c0, c1 = max(0, col - 1), min(grid.cols, col + 1)
        if r0 < r1 and c0 < c1:
            mask[r0:r1, c0:c1] = True
    return mask


def quantise(height: NDArray[np.float64], step: int, base: int) -> NDArray[np.float64]:
    """Height tiers: round((h - base) / step), halves rounding up; NaN (no ground) stays NaN."""
    return np.floor((height - base) / step + 0.5)
