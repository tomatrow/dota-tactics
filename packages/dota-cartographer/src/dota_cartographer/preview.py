"""preview.png: a quick visual check of the frame, bounds and layers.

Walkable ground is coloured by height level (dark violet = lowest walkable level, through sand and green,
to pale = highest), non-walkable ground is grey, water is tinted blue, tree cells are dark green, lanes
are thin team-coloured lines and entities are team-coloured dots with short labels. North is up.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from numpy.typing import NDArray
from PIL import Image, ImageDraw, ImageFont

from .assemble import MapData
from .entities import Marker

SCALE = 4  # pixels per cell
VOID = (18, 18, 22)
BLOCKED = (105, 105, 110)
WATER = (55, 120, 205)
TREE = (24, 66, 34)
TEAM = {"radiant": (90, 230, 120), "dire": (240, 80, 64), "neutral": (250, 210, 70), "none": (240, 240, 240)}
# Level ramp stops, from the lowest level to the highest.
RAMP = np.array([(70, 45, 95), (150, 130, 90), (110, 155, 75), (175, 185, 100), (235, 225, 190)], np.float64)
LABEL = {
    "barracks": "rax",
    "ancient": "ANC",
    "fountain": "ftn",
    "roshan": "ROSH",
    "roshan_pit": "pit",
    "tormentor": "torm",
    "outpost": "out",
    "rune_power": "rune",
    "rune_bounty": "$",
    "twin_gate": "gate",
    "lotus_pool": "lotus",
    "wisdom_shrine": "shrine",
    "watcher": "w",
    "neutral_stash": "stash",
}
CAMP = {"small": "s", "medium": "m", "large": "L", "ancient": "A"}


def _ramp(t: NDArray[np.float64]) -> NDArray[np.float64]:
    stops = np.linspace(0.0, 1.0, len(RAMP))
    return np.stack([np.interp(t, stops, RAMP[:, ch]) for ch in range(3)], axis=-1)


def _label(m: Marker) -> str:
    if m.kind == "tower":
        return f"T{m.extras.get('tier', '?')}"
    if m.kind == "neutral_camp":
        return CAMP.get(str(m.extras.get("size", "")), "c")
    if m.kind == "shop":
        return "secret" if m.extras.get("shop") == "secret" else "shop"
    if m.kind in ("filler", "lane_spawner", "building"):
        return ""
    return LABEL.get(m.kind, m.kind.removeprefix("npc_dota_").removeprefix("ent_dota_")[:8])


def render(data: MapData, path: Path) -> None:
    grid = data.grid
    rgb = np.empty((grid.rows, grid.cols, 3), np.float64)
    rgb[:] = VOID

    ground = ~np.isnan(data.level)
    walk_levels = data.level[ground & data.walkable]
    lo, hi = (float(walk_levels.min()), float(walk_levels.max())) if walk_levels.size else (0.0, 1.0)
    if ground.any():
        t = np.clip(np.where(ground, (data.level - lo) / max(hi - lo, 1.0), 0.0), 0.0, 1.0)
        rgb[ground] = _ramp(t)[ground]
    blocked = ground & ~data.walkable
    rgb[blocked] = rgb[blocked] * 0.25 + np.array(BLOCKED) * 0.75
    rgb[data.water] = rgb[data.water] * 0.4 + np.array(WATER) * 0.6
    rgb[data.tree] = TREE

    pixels = np.repeat(np.repeat(rgb[::-1].astype(np.uint8), SCALE, axis=0), SCALE, axis=1)
    image = Image.fromarray(pixels, "RGB")
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=11)
    height = grid.rows * SCALE

    def px(x: float, y: float) -> tuple[float, float]:
        return (x - grid.origin[0]) / grid.cell * SCALE, height - (y - grid.origin[1]) / grid.cell * SCALE

    for lane in data.lanes:
        draw.line([px(x, y) for x, y, _ in lane.points], fill=TEAM[lane.team], width=2)

    for m in data.markers:
        x, y = px(m.x, m.y)
        colour = TEAM.get(m.team, TEAM["none"])
        r = 5 if m.kind in ("tower", "barracks", "ancient", "fountain", "roshan", "tormentor") else 3
        draw.ellipse((x - r, y - r, x + r, y + r), fill=colour, outline=(0, 0, 0))
        if text := _label(m):
            draw.text((x + r + 1, y - 6), text, fill=colour, font=font, stroke_width=2, stroke_fill=(0, 0, 0))

    levels = f"walkable levels {int(lo)}..{int(hi)}" if walk_levels.size else ""
    title = f"dota-cartographer  {grid.cols}x{grid.rows} cells of {grid.cell} units  {levels}"
    draw.text((8, 6), title, fill=(255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)
