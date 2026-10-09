"""Combine the parsed sources into the map's layers, then into the output document."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

import numpy as np
from numpy.typing import NDArray

from . import __version__
from .entities import Bounds, Entity, Lane, Marker, TileGrid, lanes, map_bounds, markers, tile_grid
from .gnv import GnvFlag, GridNav
from .grid import Grid, quantise, tree_mask
from .terrain import Meshes, sample
from .trm import Tree, TreeMap

SCHEMA = 1


@dataclass(frozen=True)
class MapData:
    grid: Grid
    bounds: Bounds
    tile_grid: TileGrid
    height: NDArray[np.float64]  # NaN = no ground
    height_range: NDArray[np.float64]
    level: NDArray[np.float64]  # whole numbers; NaN = no ground
    walkable: NDArray[np.bool_]
    water: NDArray[np.bool_]
    tree: NDArray[np.bool_]
    gnv: NDArray[np.uint8]
    tree_layers: tuple[str, ...]
    trees: tuple[Tree, ...]  # unique positions, sorted south to north, west to east
    duplicate_trees: int
    markers: tuple[Marker, ...]
    lanes: tuple[Lane, ...]


def assemble(gridnav: GridNav, treemap: TreeMap, entities: Sequence[Entity], meshes: Meshes) -> MapData:
    tiers = tile_grid(entities)
    bounds = map_bounds(entities)
    if bounds is None:
        box = gridnav.traversable_bounds()
        if box is None:
            raise ValueError("no bounds: no minimap boundary, no world_bounds and no traversable cells")
        bounds = Bounds((box[0][0], box[0][1]), (box[1][0], box[1][1]), "gnv traversable cells")
    grid = Grid.covering(gridnav.edge, bounds.min, bounds.max)

    flags = gridnav.crop(*grid.first_cell, grid.cols, grid.rows)
    terrain = sample(meshes, grid)

    unique: dict[tuple[int, int], Tree] = {}
    for t in treemap.trees:
        unique.setdefault((t.x, t.y), t)
    trees = tuple(sorted(unique.values(), key=lambda t: (t.y, t.x)))

    return MapData(
        grid=grid,
        bounds=bounds,
        tile_grid=tiers,
        height=terrain.height,
        height_range=terrain.height_range,
        level=quantise(terrain.height, tiers.step_height, tiers.min_height),
        walkable=(flags & GnvFlag.TRAVERSABLE) != 0,
        water=terrain.water,
        tree=tree_mask(grid, unique.keys()),
        gnv=flags,
        tree_layers=treemap.layers,
        trees=trees,
        duplicate_trees=len(treemap.trees) - len(trees),
        markers=tuple(markers(entities)),
        lanes=tuple(lanes(entities)),
    )


def _round(v: float) -> int:
    """Round half up (Python's round() rounds halves to even)."""
    return math.floor(v + 0.5)


def _ints(a: NDArray[np.float64]) -> list[list[int | None]]:
    return [[None if math.isnan(v) else _round(v) for v in row] for row in a.tolist()]


def _span(levels: NDArray[np.float64]) -> list[int] | None:
    return [int(levels.min()), int(levels.max())] if levels.size else None


def _bits(a: NDArray[np.bool_]) -> list[list[int]]:
    return a.astype(np.int64).tolist()


def document(data: MapData, source: dict[str, str]) -> dict[str, Any]:
    """The dota_map.json document. `source` describes the input (VPK name and hash, map, VRF version)."""
    grid = data.grid
    ground = ~np.isnan(data.level)
    entities: list[dict[str, Any]] = []
    for m in data.markers:
        cell = grid.cell_of(m.x, m.y)
        entities.append(
            {
                "kind": m.kind,
                "class": m.cls,
                "name": m.name,
                "unit": m.unit,
                "team": m.team,
                "x": _round(m.x),
                "y": _round(m.y),
                "z": _round(m.z),
                "yaw": _round(m.yaw) % 360,
                "cell": list(cell) if cell else None,
                **m.extras,
            }
        )
    return {
        "meta": {
            "schema": SCHEMA,
            "generator": f"dota-cartographer {__version__}",
            "source": source,
            "units": "Dota game units; x east, y north, z up",
            "tileGrid": {
                "stepHeight": data.tile_grid.step_height,
                "minHeight": data.tile_grid.min_height,
                "maxHeight": data.tile_grid.max_height,
                "heightShift": data.tile_grid.height_shift,
            },
            "levels": {
                "ground": _span(data.level[ground]),
                "walkable": _span(data.level[ground & data.walkable]),
            },
            "bounds": {
                "source": data.bounds.source,
                "min": [_round(v) for v in data.bounds.min],
                "max": [_round(v) for v in data.bounds.max],
            },
            "gnvFlags": {
                "traversable": int(GnvFlag.TRAVERSABLE),
                "blocked": int(GnvFlag.BLOCKED),
                "heroBlocking": int(GnvFlag.HERO_BLOCKING),
                "creatureBlocking": int(GnvFlag.CREATURE_BLOCKING),
                "wardBlocking": int(GnvFlag.WARD_BLOCKING),
            },
        },
        "grid": {"cell": grid.cell, "origin": list(grid.origin), "cols": grid.cols, "rows": grid.rows},
        "layers": {
            "height": _ints(data.height),
            "heightRange": _ints(data.height_range),
            "level": _ints(data.level),
            "walkable": _bits(data.walkable),
            "water": _bits(data.water),
            "tree": _bits(data.tree),
            "gnv": data.gnv.astype(np.int64).tolist(),
        },
        "treeLayers": [name or None for name in data.tree_layers],
        "trees": [[t.x, t.y, t.layer] for t in data.trees],
        "entities": entities,
        "lanes": [
            {
                "lane": lane.lane,
                "team": lane.team,
                "points": [[_round(x), _round(y), _round(z)] for x, y, z in lane.points],
            }
            for lane in data.lanes
        ],
    }
