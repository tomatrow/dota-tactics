# dota-tactics

Final Fantasy Tactics Advance rules on the real Dota 2 map: races and jobs, abilities learned
from equipment, facing and height — with Dota's lanes, creep waves, towers and Ancient. One hero
per player, real-time with an ATB gauge.

The design is in [DESIGN.md](./DESIGN.md); conventions are in [AGENTS.md](./AGENTS.md).

**Status:** milestone 3 of the prototype slice (`DESIGN.md` §11). You play a Bangaa Warrior in
the mid lane: walk from the Clan Hall, last-hit and deny the creep waves, use First Aid and Body
Slam, push the Dire T1, die to it and respawn. Everything runs on a deterministic 20 Hz
simulation; `?seed=123` replays a game's creeps and rolls. No enemy hero yet.

## Usage

Node and pnpm are pinned in the repo-root `mise.toml`.

```sh
pnpm install                 # from the repo root, once
cd packages/dota-tactics
pnpm dev                     # http://localhost:5173
```

| Script                        | What it does                                                          |
| ----------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                    | Dev server                                                            |
| `pnpm build` / `pnpm preview` | Static site in `build/`                                               |
| `pnpm check`                  | svelte-check and TypeScript                                           |
| `pnpm lint` / `pnpm format`   | Prettier and ESLint                                                   |
| `pnpm test`                   | Vitest unit tests (Node)                                              |
| `pnpm lane-sim`               | Headless mid lane, no heroes; prints timings (`--minutes`, `--seeds`) |

## Controls

Dota 2's default layout. Commands always go to your hero.

| Input                    | Does                                           |
| ------------------------ | ---------------------------------------------- |
| Right-click ground       | Move                                           |
| Right-click enemy        | Attack; repeats until it dies                  |
| Right-click own creep    | Deny, under 50% HP (otherwise walk to it)      |
| Q / W / E                | First Aid / Rend Speed (not yet) / Body Slam   |
| Left-click (after E)     | Body Slam's target; right-click or Esc cancels |
| A, then left-click       | Attack-move                                    |
| S / H                    | Stop                                           |
| Left-click a unit        | Inspect it                                     |
| F1                       | Select and centre on your hero                 |
| Space (hold)             | Keep the camera on your hero                   |
| F9                       | Pause                                          |
| Screen edge, middle-drag | Pan                                            |
| Wheel                    | Zoom                                           |
| `[` / `]`                | Turn the view 90°                              |

The gauge (CT) fills only while you stand still; every action empties it. Items (ZXCVBN) come
later.

## Built on

- [`dota-cartographer`](../dota-cartographer): extracts the map to `out/dota_map.json`
- [`dota-tactics-grid`](../dota-tactics-grid): the board (terrain, trees, buildings, picking,
  renderer), imported as a workspace package
- [`threlte-tactics`](../threlte-tactics): the Liquid Fire tactics engine port, for its ideas
  (ability pipeline, stat modifiers, status effects)
