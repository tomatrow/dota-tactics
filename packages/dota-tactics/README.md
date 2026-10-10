# dota-tactics

Final Fantasy Tactics Advance rules on the real Dota 2 map: races and jobs, abilities learned
from equipment, facing and height — with Dota's lanes, creep waves, towers and Ancient. One hero
per player, real-time with an ATB gauge.

The design is in [DESIGN.md](./DESIGN.md); conventions are in [AGENTS.md](./AGENTS.md).

**Status:** milestone 2 of the prototype slice (`DESIGN.md` §11). The mid lane runs on its own:
creep waves every 30 s walk the real map, fight in the river and push into the T1 Sentinels,
on a deterministic 20 Hz simulation. No heroes yet. `?seed=123` replays a game.

## Usage

Node and pnpm are pinned in the repo-root `mise.toml`.

```sh
pnpm install                 # from the repo root, once
cd packages/dota-tactics
pnpm dev                     # http://localhost:5173
```

| Script                        | What it does                |
| ----------------------------- | --------------------------- |
| `pnpm dev`                    | Dev server                  |
| `pnpm build` / `pnpm preview` | Static site in `build/`     |
| `pnpm check`                  | svelte-check and TypeScript |
| `pnpm lint` / `pnpm format`   | Prettier and ESLint         |
| `pnpm test`                   | Vitest unit tests (Node)    |

## Controls

| Input                    | Does                        |
| ------------------------ | --------------------------- |
| Space (hold)             | Keep the camera on the pawn |
| F1                       | Centre on the pawn          |
| Screen edge, middle-drag | Pan                         |
| Wheel                    | Zoom                        |
| `[` / `]`                | Turn the view 90°           |

The full Dota 2 layout (right-click to move and attack, QWERDF abilities, ZXCVBN items) arrives
with the hero in milestone 3.

## Built on

- [`dota-cartographer`](../dota-cartographer): extracts the map to `out/dota_map.json`
- [`dota-tactics-grid`](../dota-tactics-grid): the board (terrain, trees, buildings, picking,
  renderer), imported as a workspace package
- [`threlte-tactics`](../threlte-tactics): the Liquid Fire tactics engine port, for its ideas
  (ability pipeline, stat modifiers, status effects)
