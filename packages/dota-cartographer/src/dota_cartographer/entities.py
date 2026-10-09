"""Entity lumps decompiled by VRF (`maps/<map>/entities/*.vents`): parsing, map markers and lanes.

VRF writes each lump as text blocks:

    ====12====
    classname                      "npc_dota_tower"
    origin                         [ -3951.997803, -6112.0, 255.999939 ]

A multi-line value starts with a line ending in three double quotes and runs to the next line that is
exactly three double quotes. Values stay raw strings; accessors decode the bits we need.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from pathlib import Path

_BLOCK = re.compile(r"^====\d+====$")
_LINE = re.compile(r"^(\S+)\s*(.*)$")
_PREFAB = re.compile(r"^\[PR#\]")
_TOKENS = re.compile(r"[a-z0-9]+")
_MULTILINE = '"""'
_RESOURCE = "resource_name:"


@dataclass(frozen=True)
class Entity:
    keys: dict[str, str]
    lump: str  # file stem the entity came from, e.g. "default_ents"

    @property
    def classname(self) -> str:
        return self.text("classname") or ""

    @property
    def name(self) -> str:
        """Target name without the "[PR#]" prefix that prefab instancing adds."""
        return _PREFAB.sub("", self.text("targetname") or "")

    @property
    def origin(self) -> tuple[float, float, float]:
        v = self.vector("origin")
        return (v[0], v[1], v[2]) if v and len(v) == 3 else (0.0, 0.0, 0.0)

    @property
    def yaw(self) -> float:
        v = self.vector("angles")
        return v[1] if v and len(v) == 3 else 0.0

    def text(self, key: str) -> str | None:
        raw = self.keys.get(key)
        if raw is None:
            return None
        raw = raw.removeprefix(_RESOURCE)
        if len(raw) >= 2 and raw[0] == raw[-1] == '"':
            return raw[1:-1]
        return raw

    def vector(self, key: str) -> list[float] | None:
        """Numbers in `[ 1.0, 2.0 ]`, `"1.0 2.0"` or bare `1.0` form."""
        raw = self.text(key)
        if raw is None:
            return None
        try:
            return [float(p) for p in raw.strip("[] ").replace(",", " ").split()]
        except ValueError:
            return None

    def number(self, key: str) -> float | None:
        v = self.vector(key)
        return v[0] if v is not None and len(v) == 1 else None


def parse_lump(text: str, lump: str) -> list[Entity]:
    entities: list[Entity] = []
    keys: dict[str, str] | None = None
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        i += 1
        if _BLOCK.match(line):
            keys = {}
            entities.append(Entity(keys, lump))
            continue
        if not line.strip():
            continue
        m = _LINE.match(line)
        if keys is None or m is None:
            raise ValueError(f"{lump} line {i}: {line[:60]!r} is outside an entity block")
        key, value = m.group(1), m.group(2)
        if value == _MULTILINE:
            start = i
            while i < len(lines) and lines[i] != _MULTILINE:
                i += 1
            if i == len(lines):
                raise ValueError(f"{lump} line {start}: multi-line value for {key!r} never ends")
            value = "\n".join(lines[start:i])
            i += 1
        keys[key] = value
    return entities


def read_lumps(paths: Iterable[Path]) -> list[Entity]:
    entities: list[Entity] = []
    for path in sorted(paths):
        entities += parse_lump(path.read_text(encoding="utf-8"), path.stem)
    return entities


# --- World settings ---------------------------------------------------------------------------------


@dataclass(frozen=True)
class TileGrid:
    """Dota's height tiers from worldspawn's `_dotatilegrid_*` keys."""

    step_height: int
    min_height: int
    max_height: int
    height_shift: int


def tile_grid(entities: Sequence[Entity]) -> TileGrid:
    world = next((e for e in entities if e.classname == "worldspawn"), None)
    if world is None:
        raise ValueError("no worldspawn entity in the entity lumps")
    values: dict[str, int] = {}
    for key in ("stepheight", "minheight", "maxheight", "heightshift"):
        v = world.number(f"_dotatilegrid_{key}")
        if v is None:
            raise ValueError(f"worldspawn has no _dotatilegrid_{key}; is this a Dota map?")
        values[key] = int(v)
    if values["stepheight"] <= 0:
        raise ValueError(f"worldspawn _dotatilegrid_stepheight is {values['stepheight']}")
    return TileGrid(values["stepheight"], values["minheight"], values["maxheight"], values["heightshift"])


@dataclass(frozen=True)
class Bounds:
    min: tuple[float, float]
    max: tuple[float, float]
    source: str


def map_bounds(entities: Sequence[Entity]) -> Bounds | None:
    """The minimap boundary (what the game shows as the map), else the world_bounds entity."""
    corners = [e.origin for e in entities if e.classname == "dota_minimap_boundary"]
    if len(corners) >= 2:
        xs, ys = [c[0] for c in corners], [c[1] for c in corners]
        return Bounds((min(xs), min(ys)), (max(xs), max(ys)), "dota_minimap_boundary")
    world = next((e for e in entities if e.classname == "world_bounds"), None)
    if world is not None:
        lo, hi = world.vector("min"), world.vector("max")
        if lo and hi and len(lo) >= 2 and len(hi) >= 2:
            return Bounds((lo[0], lo[1]), (hi[0], hi[1]), "world_bounds")
    return None


def tree_positions(entities: Sequence[Entity]) -> set[tuple[int, int]]:
    return {(round(e.origin[0]), round(e.origin[1])) for e in entities if e.classname == "ent_dota_tree"}


# --- Map markers -----------------------------------------------------------------------------------

KINDS = {
    "npc_dota_tower": "tower",
    "npc_dota_barracks": "barracks",
    "npc_dota_fort": "ancient",
    "ent_dota_fountain": "fountain",
    "ent_dota_shop": "shop",
    "npc_dota_roshan_spawner": "roshan",
    "trigger_boss_attackable": "roshan_pit",
    "npc_dota_miniboss_spawner": "tormentor",
    "npc_dota_watch_tower": "outpost",
    "dota_item_rune_spawner_powerup": "rune_power",
    "dota_item_rune_spawner_bounty": "rune_bounty",
    "npc_dota_neutral_spawner": "neutral_camp",
    "npc_dota_unit_twin_gate": "twin_gate",
    "npc_dota_lotus_pool": "lotus_pool",
    "npc_dota_xp_fountain": "wisdom_shrine",
    "npc_dota_lantern": "watcher",
    "npc_dota_building": "building",  # "filler" when its name says so
    "ent_dota_neutral_item_stash": "neutral_stash",
}
_LANE_SPAWNER = re.compile(r"^npc_dota_spawner_(good|bad)_(top|mid|bot)$")
# Unknown classes with these prefixes pass through with kind = classname, so new patch features show up.
PASS_THROUGH = ("npc_dota_", "ent_dota_", "dota_item_rune_spawner")
# ...except these, which are plumbing or handled elsewhere.
DROP = frozenset({"ent_dota_tree", "ent_dota_lightinfo", "ent_dota_game_events"})

TEAM_NUMBERS = {2: "radiant", 3: "dire", 4: "neutral"}
_RADIANT = frozenset({"goodguys", "good", "radiant"})
_DIRE = frozenset({"badguys", "bad", "dire"})
_LANES = ("top", "mid", "bot")
CAMP_SIZES = {0: "small", 1: "medium", 2: "large", 3: "ancient"}
SHOP_TYPES = {0: "home", 1: "side", 2: "secret"}


@dataclass(frozen=True)
class Marker:
    kind: str
    cls: str
    name: str
    unit: str | None
    team: str
    x: float
    y: float
    z: float
    yaw: float
    extras: dict[str, str | int] = field(default_factory=dict)


def _tokens(*parts: str | None) -> set[str]:
    return set(_TOKENS.findall(" ".join(p for p in parts if p).lower()))


def _kind(e: Entity) -> str | None:
    cls = e.classname
    if cls in DROP:
        return None
    if cls in KINDS:
        kind = KINDS[cls]
        return "filler" if kind == "building" and "filler" in e.name.lower() else kind
    if _LANE_SPAWNER.match(cls):
        return "lane_spawner"
    if cls.startswith(PASS_THROUGH):
        return cls
    return None


def _team(e: Entity, unit: str | None) -> str:
    """The entity's team number when it's 2-4, otherwise good/bad/radiant/dire in its names."""
    number = e.number("teamnumber")
    if number is not None and int(number) in TEAM_NUMBERS:
        return TEAM_NUMBERS[int(number)]
    toks = _tokens(e.classname, e.name, unit)
    radiant, dire = bool(toks & _RADIANT), bool(toks & _DIRE)
    if radiant != dire:
        return "radiant" if radiant else "dire"
    return "none"


def _lane(toks: set[str]) -> str | None:
    return next((lane for lane in _LANES if lane in toks), None)


def _extras(kind: str, e: Entity, unit: str | None) -> dict[str, str | int]:
    # The unit name is the more precise source: both tier-4 towers are "npc_dota_*_tower4" (no lane).
    label = unit or e.name
    toks = _tokens(label)
    extras: dict[str, str | int] = {}
    if kind == "tower":
        tier = re.search(r"tower(\d+)", label)
        if tier:
            extras["tier"] = int(tier.group(1))
        if lane := _lane(toks):
            extras["lane"] = lane
    elif kind == "barracks":
        if lane := _lane(toks):
            extras["lane"] = lane
        if kind_of := next((t for t in ("melee", "range") if t in toks), None):
            extras["type"] = kind_of
    elif kind == "lane_spawner":
        if lane := _lane(_tokens(e.classname)):
            extras["lane"] = lane
    elif kind == "neutral_camp":
        size = e.number("neutraltype")
        if size is not None:
            extras["size"] = CAMP_SIZES.get(int(size), str(int(size)))
    elif kind == "shop":
        shop = e.number("shoptype")
        if shop is not None:
            extras["shop"] = SHOP_TYPES.get(int(shop), str(int(shop)))
    return extras


def markers(entities: Sequence[Entity]) -> list[Marker]:
    out: list[Marker] = []
    for e in entities:
        kind = _kind(e)
        if kind is None:
            continue
        unit = e.text("mapunitname") or None
        x, y, z = e.origin
        out.append(
            Marker(
                kind, e.classname, e.name, unit, _team(e, unit), x, y, z, e.yaw % 360, _extras(kind, e, unit)
            )
        )
    return sorted(out, key=lambda m: (m.kind, m.team, m.name, m.x, m.y))


# --- Lanes -----------------------------------------------------------------------------------------

_LANE_NODE = re.compile(r"^lane_(top|mid|bot)_pathcorner_(goodguys|badguys)_")


@dataclass(frozen=True)
class Lane:
    lane: str
    team: str
    points: tuple[tuple[float, float, float], ...]


def lanes(entities: Sequence[Entity]) -> list[Lane]:
    """Creep lanes: chains of `lane_<lane>_pathcorner_<team>_*` path_corners linked by `target`."""
    nodes = {e.name: e for e in entities if e.classname == "path_corner" and _LANE_NODE.match(e.name)}
    nxt = {name: _PREFAB.sub("", e.text("target") or "") for name, e in nodes.items()}
    targeted = {t for name, t in nxt.items() if t in nodes and t != name}
    out: list[Lane] = []
    for head in sorted(n for n in nodes if n not in targeted):
        m = _LANE_NODE.match(head)
        assert m is not None
        points: list[tuple[float, float, float]] = []
        seen: set[str] = set()
        node: str | None = head
        while node in nodes and node not in seen:
            seen.add(node)
            points.append(nodes[node].origin)
            node = nxt[node]
        team = "radiant" if m.group(2) == "goodguys" else "dire"
        out.append(Lane(m.group(1), team, tuple(points)))
    return sorted(out, key=lambda lane: (lane.team, _LANES.index(lane.lane), lane.points))
