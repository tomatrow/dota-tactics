"""The end-of-run summary, plus sanity checks that warn (never fail) so a patch can't break the run."""

from __future__ import annotations

from collections import Counter

import numpy as np

from .assemble import MapData

# What the current map is expected to have. A mismatch is a warning: patches change maps.
EXPECTED_COUNTS = {"tower": 22, "barracks": 12, "ancient": 2, "fountain": 2, "roshan": 1, "tormentor": 2}
EXPECTED_LANES = 6
MIN_TREES = 2000
MIN_SYMMETRY = 0.8  # walkable cells vs the map rotated 180°, as intersection over union
# Buildings stand on walkable ground: their origin z should match the sampled terrain height (checks the
# physics frame) and their cell should be GridNav-traversable (checks the GridNav frame; the symmetry check
# can't, since a mirrored map is just as symmetric).
GROUNDED = frozenset({"tower", "barracks", "ancient", "filler", "outpost"})
GROUND_TOLERANCE = 32
MIN_GROUNDED = 0.9


def symmetry(walkable: np.ndarray) -> float:
    rotated = walkable[::-1, ::-1]
    union = np.count_nonzero(walkable | rotated)
    return np.count_nonzero(walkable & rotated) / union if union else 0.0


def grounded(data: MapData) -> tuple[int, int, int]:
    """(buildings at terrain height, buildings on walkable cells, buildings checked)."""
    at_height = on_walkable = total = 0
    for m in data.markers:
        cell = data.grid.cell_of(m.x, m.y)
        if m.kind not in GROUNDED or cell is None:
            continue
        col, row = cell
        total += 1
        h = data.height[row, col]
        at_height += int(not np.isnan(h) and abs(h - m.z) <= GROUND_TOLERANCE)
        on_walkable += int(data.walkable[row, col])
    return at_height, on_walkable, total


def summarise(data: MapData, entity_trees: set[tuple[int, int]]) -> tuple[list[str], list[str]]:
    """(summary lines, warnings)."""
    grid, tiers = data.grid, data.tile_grid
    lines: list[str] = []
    warnings: list[str] = []

    lines.append(
        f"Grid: {grid.cols}x{grid.rows} cells of {grid.cell} units from {grid.origin} "
        f"(bounds: {data.bounds.source})"
    )
    walk = data.walkable
    level = data.level
    lines.append(f"Walkable cells by level (step {tiers.step_height} above {tiers.min_height}):")
    known = walk & ~np.isnan(level)
    for lv, n in sorted(Counter(level[known].astype(int).tolist()).items()):
        lines.append(f"  level {lv:>3}: {n:>6} ({n / max(1, known.sum()):6.1%})")
    unlevelled = int(np.count_nonzero(walk & np.isnan(level)))
    if unlevelled:
        warnings.append(f"{unlevelled} walkable cells have no ground under them")
    lines.append(
        f"Walkable {int(walk.sum())} · water {int(data.water.sum())} · tree cells {int(data.tree.sum())} "
        f"· open (walkable, no tree) {int((walk & ~data.tree).sum())}"
    )

    tree_positions = {(t.x, t.y) for t in data.trees}
    layers = Counter(data.tree_layers[t.layer] or "default" for t in data.trees)
    lines.append(f"Trees: {len(data.trees)} (" + ", ".join(f"{k} {v}" for k, v in layers.most_common()) + ")")
    lines.append(
        f"  vs ent_dota_tree entities: {len(entity_trees)}; only in the tree map "
        f"{len(tree_positions - entity_trees)}, only in entities {len(entity_trees - tree_positions)}; "
        f"duplicates dropped {data.duplicate_trees}"
    )
    if len(data.trees) < MIN_TREES:
        warnings.append(f"only {len(data.trees)} trees, expected at least {MIN_TREES}")
    off_corner = sum(1 for t in data.trees if t.x % grid.cell or t.y % grid.cell)
    if off_corner:
        warnings.append(f"{off_corner} trees are not on a {grid.cell}-unit grid corner (snapped)")

    kinds = Counter(m.kind for m in data.markers)
    lines.append("Entities: " + ", ".join(f"{k} x{v}" for k, v in sorted(kinds.items())))
    for kind, expected in EXPECTED_COUNTS.items():
        if kinds[kind] != expected:
            warnings.append(f"{kind}: expected {expected}, found {kinds[kind]}")
    outside = [m for m in data.markers if grid.cell_of(m.x, m.y) is None]
    if outside:
        warnings.append(
            f"{len(outside)} entities lie outside the grid: " + ", ".join(m.kind for m in outside)
        )

    lines.append("Lanes: " + ", ".join(f"{la.team} {la.lane} ({len(la.points)} points)" for la in data.lanes))
    if len(data.lanes) != EXPECTED_LANES:
        warnings.append(f"expected {EXPECTED_LANES} lanes, found {len(data.lanes)}")

    sym = symmetry(walk)
    lines.append(f"Symmetry: walkable cells vs 180° rotation overlap {sym:.1%}")
    if sym < MIN_SYMMETRY:
        warnings.append(f"walkable symmetry {sym:.1%} is under {MIN_SYMMETRY:.0%}; check the frame")

    at_height, on_walkable, total = grounded(data)
    lines.append(
        f"Frame check: of {total} buildings, {at_height} are within {GROUND_TOLERANCE} units of the terrain "
        f"and {on_walkable} stand on walkable cells"
    )
    if total and at_height / total < MIN_GROUNDED:
        warnings.append(f"only {at_height}/{total} buildings sit at terrain height; check the physics frame")
    if total and on_walkable / total < MIN_GROUNDED:
        warnings.append(
            f"only {on_walkable}/{total} buildings stand on walkable cells; check the GridNav frame"
        )
    return lines, warnings
