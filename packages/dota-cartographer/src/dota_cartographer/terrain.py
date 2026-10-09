"""Ground height and water from the map's collision mesh (`world_physics`, exported by VRF as glb).

The glb's raw vertices are game units, Z-up; only the glTF node carries VRF's inch-to-metre scale and
Y-up rotation, so we read the geometry without the scene transform. Groups VRF names:

    physics_group               terrain and cliffs (no buildings: those are separate models)
    physics_water_slime         river and pool surfaces
    physics_npcclip_playerclip  invisible clip brushes (ignored)
    physics_window              ignored
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import trimesh
from numpy.typing import NDArray

from .grid import Grid

GROUND = "physics_group"
WATER = "physics_water_slime"


@dataclass(frozen=True)
class Meshes:
    ground: trimesh.Trimesh
    water: trimesh.Trimesh | None


@dataclass(frozen=True)
class Terrain:
    height: NDArray[np.float64]  # (rows, cols) topmost ground at the cell centre; NaN = no ground
    height_range: NDArray[np.float64]  # max - min over a 3x3 sample grid spanning the cell; NaN = no ground
    water: NDArray[np.bool_]  # a water surface lies above the ground at the cell centre


def load(path: Path) -> Meshes:
    scene = trimesh.load_scene(path)
    geometry = {name: g for name, g in scene.geometry.items() if isinstance(g, trimesh.Trimesh)}
    if GROUND not in geometry:
        raise ValueError(f"{path} has no {GROUND!r} mesh; meshes found: {sorted(geometry)}")
    return Meshes(geometry[GROUND], geometry.get(WATER))


def _cast_down(
    mesh: trimesh.Trimesh, xs: NDArray[np.float64], ys: NDArray[np.float64]
) -> NDArray[np.float64]:
    """Z of the first surface hit by a ray cast straight down at every (x, y); NaN where nothing is hit."""
    gx, gy = np.meshgrid(xs, ys)
    top = float(mesh.bounds[1][2]) + 1024.0
    origins = np.column_stack([gx.ravel(), gy.ravel(), np.full(gx.size, top)])
    directions = np.broadcast_to(np.array([0.0, 0.0, -1.0]), origins.shape)
    locations, rays, _ = mesh.ray.intersects_location(origins, directions, multiple_hits=False)
    z = np.full(gx.size, np.nan)
    z[rays] = locations[:, 2]
    return z.reshape(gx.shape)


def sample(meshes: Meshes, grid: Grid) -> Terrain:
    # Sample every half cell: centres sit at odd lattice indices, corners and edge midpoints around them.
    half = grid.cell / 2
    xs = grid.origin[0] + half * np.arange(2 * grid.cols + 1, dtype=np.float64)
    ys = grid.origin[1] + half * np.arange(2 * grid.rows + 1, dtype=np.float64)
    lattice = _cast_down(meshes.ground, xs, ys)
    height = lattice[1::2, 1::2].copy()

    blocks = np.lib.stride_tricks.sliding_window_view(lattice, (3, 3))[::2, ::2]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)  # all-NaN blocks off the map edge
        height_range = np.nanmax(blocks, axis=(2, 3)) - np.nanmin(blocks, axis=(2, 3))
    height_range[np.isnan(height)] = np.nan

    water = np.zeros(height.shape, np.bool_)
    if meshes.water is not None:
        cx, cy = grid.centres()
        surface = _cast_down(meshes.water, cx, cy)
        with np.errstate(invalid="ignore"):
            water = ~np.isnan(surface) & (np.isnan(height) | (surface > height))
    return Terrain(height, height_range, water)
