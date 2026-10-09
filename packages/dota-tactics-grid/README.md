# dota-tactics-grid

A 3D tactics-board view of the real Dota 2 map, in the style of Final Fantasy Tactics. Every
64-unit tile is drawn at its real height, with all 2,483 trees, every gameplay entity and the
creep lanes. It reads the data that [`dota-cartographer`](../dota-cartographer) extracts from
the game, so nothing is hand-placed.

It's a single-page SvelteKit app, client-rendered and built as a static site, drawing with plain
three.js.

## Usage

Node and pnpm are pinned in the repo-root `mise.toml`.

```sh
pnpm install                 # from the repo root, once
cd packages/dota-tactics-grid
pnpm dev                     # http://localhost:5173
```

| Script                        | What it does                                        |
| ----------------------------- | --------------------------------------------------- |
| `pnpm dev`                    | Dev server                                          |
| `pnpm build` / `pnpm preview` | Static site in `build/`, and a server to look at it |
| `pnpm check`                  | svelte-check and TypeScript                         |
| `pnpm lint` / `pnpm format`   | Prettier and ESLint, matching `threlte-tactics`     |
| `pnpm test`                   | Vitest unit tests (Node, synthetic maps)            |

### The data

The page loads `../dota-cartographer/out/dota_map.json`, which is committed:

- **In dev**, Vite serves it straight from the sibling package (`server.fs.allow` in
  `vite.config.ts`).
- **In a build**, it's copied in as a hashed asset.

To pick up a new Dota patch, run `mise run extract` in `packages/dota-cartographer` and reload. The
viewer reads schema 1 and refuses any other version with a clear message.

## What you're looking at

**The board.**

- Each tile is a column at its real ground height (`layers.height`). Ramps read as fine stairs and
  cliffs as walls.
- Tiles with no ground (`null` height, outside the map) aren't drawn.
- The height slider exaggerates the vertical 0.5–3×. At 1×, one 128-unit level is two tiles tall.

**The terrain look** (the default layer) is derived from the data. Only the team tint is a choice.

| Tiles                                   | Drawn as                                           |
| --------------------------------------- | -------------------------------------------------- |
| `water`                                 | Water bed under a translucent animated surface     |
| Not `walkable`                          | Stone; walls taller than 96 units are stone cliffs |
| `tree`                                  | Dark forest floor                                  |
| Walkable, within 3 tiles of a lane path | Dirt road                                          |
| `heightRange` ≥ 64                      | Lighter earth (ramps and slopes)                   |
| Everything else                         | Grass, slightly lighter on higher levels           |

Colours blend from Radiant (lush) to Dire (ashen) by which Ancient is closer. A faint
checkerboard, plus tile edges that fade in as you zoom, keep single tiles readable.

**Data layers** recolour the board by Level, Height, Height range, Walkable, GridNav flags,
Water or Trees. Each has a legend with tile counts. In data layers the water surface is hidden, so
it doesn't tint the colours.

**Trees.**

- One low-poly tree per entry in `trees`, on its grid corner. Each tree covers its 2×2 tiles.
- It stands on the median height of those four tiles.
- Species follow the side: green pines and oaks for Radiant, dead or autumn trees for Dire.
- Size and rotation come from a hash of the position, so every load looks the same.

**Entities.**

- Every entity gets a hand-built model, sized roughly to its in-game footprint, placed at its
  origin and rotated by `yaw`.
- **Labels:** Ancients, fountains, Roshan, the Tormentor and the outposts.
- **Hidden by default:** lane spawners, neutral stashes and kinds the viewer doesn't know (Hall of
  Fame, base blockers). "All markers" shows them.
- **Lanes:** each team's creep path is drawn keeping to its own right, so both directions show.

**Inspecting.**

- Hovering a tile or entity shows everything about it: height and level, height range, walkable,
  water, trees and the decoded GridNav flags. For an entity it shows its class, names, team,
  position, facing and extras.
- Click to pin a selection. Click it again or press Esc to release.

**Controls.**

- **Mouse:** drag to orbit, right-drag to pan, scroll to zoom (towards the cursor).
- **Keys:** `Q` / `E` turn 90° (FFT style), `R` resets the view.
- **Toggles:** trees, entities, all markers, lanes, labels, grid lines and ambient occlusion.

## How it's built

```
src/lib/map/     the data: schema + parser, MapModel (typed arrays + derived sides and lane
                 tiles), layer colouring and legends, info-panel text
src/lib/scene/   three.js: tile columns, terrain, water, trees, entity models, lanes, cursor,
                 column picking, and the Viewer that owns renderer, camera and frame loop
src/lib/components/  the FFT windows (header, legend, info, controls) and the stage
```

- **Terrain:** one mesh. It only draws tile tops and the walls you can see, with per-vertex colours,
  so switching layers just rewrites colours. Tile edges are drawn in the shader.
- **Picking:** walks the grid along the mouse ray, column by column, rather than ray-casting the
  terrain mesh's million triangles.
- **Lighting:**
  - One sun with soft shadows, a sky fill light and a dim room environment for highlights.
  - Ground-truth ambient occlusion (`GTAOPass`) at half resolution.
  - SMAA anti-aliasing and AgX tone mapping.
- **Performance:** the board is static, so the shadow map and the AO's normal/depth buffer are only
  re-rendered when the camera or the scene changes. With AO on it holds 60 fps on Apple Silicon
  at retina size, still or orbiting.
- **SMAA instead of MSAA:** with MSAA, GTAO's full-screen passes into multisampled buffers cost
  about 15 ms a frame.

## Known limits

- **Water surface:** the data says which tiles are water but not where the surface is. Each water
  tile's surface is drawn 20 units above its bed, so steps between beds become little waterfalls.
- **Buildings** are points in the data. Their models are stand-ins and don't block tiles.
- **Radiant Tormentor:** only the Dire one is in the map's entities (the cartographer warns about
  this). The Radiant pit is visible in the terrain at level −2.
- **Platform:** desktop first. The layout adapts to narrow screens, but it isn't tuned for phones.
