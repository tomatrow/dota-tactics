# dota-cartographer

Turns the installed Dota 2 map (`dota.vpk`) into `out/dota_map.json`: a 64-unit grid with height, height
levels, walkability, water and trees, plus every tree, the gameplay entities (towers, barracks, camps,
Roshan…) and the creep lanes. It runs headless on macOS (or Linux/Windows) with no game session.

This is an isolated experiment: a Python package, not part of the pnpm workspace or the root scripts.

## Usage

Python and uv are pinned in the repo-root `mise.toml`; this package's `mise.toml` adds the tasks.

```sh
mise install                       # once, from anywhere in the repo
cd packages/dota-cartographer
mise run extract                   # finds dota.vpk in your Steam library
mise run extract --vpk path/to/dota.vpk --out somewhere/
```

The first run downloads the pinned [Source 2 Viewer CLI](https://github.com/ValveResourceFormat/ValveResourceFormat)
(v20.0, SHA-256 checked) into `.tools/`. Extracted Valve files are cached in `work/<vpk hash>/`. Both are
gitignored; only `out/` is meant to be committed. A run takes about 10 seconds, and rerunning on an
unchanged VPK writes byte-identical files.

| Task | What it does |
| --- | --- |
| `mise run extract` | `dota.vpk` → `out/dota_map.json` + `out/preview.png`, then prints a summary |
| `mise run test` | pytest (synthetic fixtures, no Valve data needed) |
| `mise run lint` | ruff lint and format check |
| `mise run format` | ruff format and safe fixes |
| `mise run check` | pyright |

The summary ends with **warnings, never failures**, so a patch can't break the run. It checks the
expected counts (22 towers, 12 barracks, 2 Ancients, 2 fountains, Roshan, 2 Tormentors), at least 2000
trees, 6 lanes, 180° symmetry, and a frame check: every building's origin should sit at the sampled
terrain height and on a walkable cell.

`out/preview.png` is the quick visual check. Walkable ground is coloured by level, from violet (lowest)
through sand and green to pale (highest). Non-walkable ground is grey, water is blue and trees are dark
green. Lanes are drawn as lines and entities as dots in team colours. North is up.

## How it works

1. **Extract** (VRF CLI): the raw `maps/dota.gnv` and `maps/dota.trm`, the entity lumps
   (`maps/dota/entities/*.vents_c`, decompiled to text), and the collision mesh
   (`maps/dota/world_physics.vmdl_c`, exported as glb).
2. **Grid**: 64-unit cells (the GridNav's own size) covering the `dota_minimap_boundary` box. That's
   ±9472 today, so 296×296 cells. Cell edges sit on multiples of 64, row 0 is the south edge and column 0
   the west edge.
3. **Layers**:
   - **Height**: rays cast straight down onto the collision mesh, sampled every half cell.
   - **Walkability**: from the GridNav.
   - **Trees**: from the tree map.
   - **Water**: from the water collision surface.
4. **Entities and lanes**: from the entity lumps.

## dota_map.json

Everything is in Dota game units: x east, y north, z up. Each layer is an array of `rows` rows of `cols`
values, so `layers.height[row][col]`, with row 0 at the south edge. The file is written one row, tree,
entity or lane per line so git diffs between patches stay readable.

| Field | Meaning |
| --- | --- |
| `meta.schema` | Format version, currently 1 |
| `meta.source` | `{vpk, sha256, map, vrf}`: the input and the VRF version that read it |
| `meta.tileGrid` | worldspawn's `_dotatilegrid_*`: `stepHeight` (128), `minHeight`, `maxHeight`, `heightShift` |
| `meta.levels` | Observed level span, as `[min, max]`, for all `ground` cells and for `walkable` cells |
| `meta.bounds` | Where the grid's box came from and its corners |
| `meta.gnvFlags` | Bit values for `layers.gnv` |
| `grid` | `{cell, origin: [x, y] of the south-west corner, cols, rows}` |
| `layers.height` | Topmost ground at the cell centre (int), or `null` where there's no ground (off-map) |
| `layers.heightRange` | Max minus min over a 3×3 sample grid spanning the cell. Large on cliffs and ramps. A vertical step shows on its low side |
| `layers.level` | `round((height − minHeight) / stepHeight)` with halves rounding up. Can be negative (the Radiant Tormentor pit is −2); `null` where there's no ground |
| `layers.walkable` | 1 if the GridNav cell is traversable. **Static terrain only**: buildings and trees aren't subtracted, so combine with `tree` and `entities` as needed |
| `layers.water` | 1 if a water surface lies above the ground. Covers the river (level 0) and the jungle ponds (levels 1–2) |
| `layers.tree` | 1 if a tree blocks the cell. Each tree covers the 2×2 cells around the grid corner it stands on |
| `layers.gnv` | Raw GridNav flags: traversable 1, blocked 2, hero-blocking 4, creature-blocking 8, ward-blocking 16 |
| `treeLayers` | World-layer names for `trees[][2]`; `null` is the default layer |
| `trees` | `[x, y, layer]` per tree, unique positions, south to north then west to east |
| `entities` | See below |
| `lanes` | `{lane: top/mid/bot, team, points: [[x, y, z], …]}`, from spawner to enemy base |

Each entity is `{kind, class, name, unit, team, x, y, z, yaw, cell}` plus kind-specific extras:

- `team` is radiant, dire, neutral or none. It comes from the entity's team number when that's 2–4,
  otherwise from good/bad/radiant/dire in its names.
- `cell` is `[col, row]`, or `null` if the entity is outside the grid.

| `kind` | Class | Extras |
| --- | --- | --- |
| `tower` | `npc_dota_tower` | `tier` 1–4; `lane` for tiers 1–3 |
| `barracks` | `npc_dota_barracks` | `lane`, `type` melee/range |
| `ancient` | `npc_dota_fort` | |
| `fountain` | `ent_dota_fountain` | |
| `shop` | `ent_dota_shop` | `shop`: home/side/secret |
| `roshan`, `roshan_pit` | `npc_dota_roshan_spawner`, `trigger_boss_attackable` | |
| `tormentor` | `npc_dota_miniboss_spawner` | |
| `outpost` | `npc_dota_watch_tower` | |
| `rune_power`, `rune_bounty` | `dota_item_rune_spawner_*` | |
| `neutral_camp` | `npc_dota_neutral_spawner` | `size`: small/medium/large/ancient |
| `twin_gate`, `lotus_pool`, `wisdom_shrine`, `watcher` | `npc_dota_unit_twin_gate`, `npc_dota_lotus_pool`, `npc_dota_xp_fountain`, `npc_dota_lantern` | |
| `filler`, `building` | `npc_dota_building` | |
| `lane_spawner` | `npc_dota_spawner_<team>_<lane>` | `lane` |
| `neutral_stash` | `ent_dota_neutral_item_stash` | |
| *the classname* | any other `npc_dota_*`, `ent_dota_*`, `dota_item_rune_spawner*` | |

The last row means new patch features show up without code changes. Engine plumbing (particles, lights,
props, triggers, trees) is dropped.

## Source formats

- **`.gnv` GridNav**, as in VRF's `GridNavFile.cs`. Header: magic `0xFADEBEAD`, edge size, centre offset,
  width/height and min cell. Then one flag byte per cell, south row first. Cell *i* spans
  [64·(min + i), 64·(min + i + 1)). This alignment checks out against the physics slopes, where it
  beats the half-cell-shifted reading clearly. Buildings and trees are *not* in it.
- **`.trm` tree map**, worked out by hand since it has no spec and VRF doesn't parse it. The header is
  `"trmp"`, version 1, the name-table offset (64), the layer count and the tree count. Then come the
  NUL-terminated layer names, then `{i32 x, i32 y, i32 layer}` per tree. It matches all 2475
  `ent_dota_tree` entities and has 8 more trees and 1 duplicate.
- **Entity lumps**: VRF text dumps, with `====N====` blocks of `key value` lines. Multi-line values sit
  between lines holding three double quotes. Prefab instancing adds `[PR#]` to names; it's stripped.
- **Collision glb**: the raw vertices are already game units, Z-up, because only the glTF node carries
  VRF's scale and Y-up rotation. The `physics_group` mesh is the terrain (no buildings) and
  `physics_water_slime` is water.
- **Not used**: `.vhcg`, a 2.3 MB height/collision grid in an unknown format, and the render meshes.

## Known gaps

- **Radiant Tormentor**: only the Dire one is in the entity lumps, so the summary warns about it. Its pit
  is still visible in the terrain at level −2. The Radiant spawner is presumably created at runtime.
- **Buildings** are points. Their footprints aren't in the GridNav or the world collision.
- **Old maps** in the install (`dota_683.vpk` … `dota_737.vpk`) store collision differently and fail with
  a clear error. Only the current `dota.vpk` is supported.
- **Tree footprint**: the 2×2 rule rests on the data (trees on grid corners, almost all spaced 128 apart),
  not on the engine's code.
