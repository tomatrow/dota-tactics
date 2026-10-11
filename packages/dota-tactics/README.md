# dota-tactics

Final Fantasy Tactics Advance rules on the real Dota 2 map: races and jobs, abilities learned
from equipment, facing and height — with Dota's lanes, creep waves, towers and Ancient. One hero
per player, real-time with an ATB gauge.

The design is in [DESIGN.md](./DESIGN.md); conventions are in [AGENTS.md](./AGENTS.md).

**Status:** milestone 5 of the prototype slice (`DESIGN.md` §11). You play a Bangaa Warrior or a
Nu Mou Black Mage in the mid lane against the AI playing the other: walk from the Clan Hall,
last-hit and deny the creep waves, fight with the Warrior's techniques or the mage's Fire,
Blizzard and Fira, kill the enemy hero, and win by destroying the enemy's mid T1. Everything
runs on a deterministic 20 Hz simulation. `?seed=123` replays a game's creeps and rolls,
`?job=blackMage` picks your hero and `?side=dire` your side (or use the controls window).

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
| `pnpm duel-sim`               | Headless games, the AI on both heroes; prints who won and how         |

## Controls

Dota 2's default layout. Commands always go to your hero.

| Input                    | Does                                                        |
| ------------------------ | ----------------------------------------------------------- |
| Right-click ground       | Move                                                        |
| Right-click enemy        | Attack; repeats until it dies                               |
| Right-click own creep    | Deny, under 50% HP (otherwise walk to it)                   |
| Q / W / E                | Warrior: First Aid / Rend Speed / Body Slam                 |
| Q / W / E                | Black Mage: Fire / Blizzard / Fira                          |
| Left-click (after Q W E) | The target: an enemy; for Fire and Fira, a tile or an enemy |
| Right-click, Esc         | Cancel the target                                           |
| A, then left-click       | Attack-move                                                 |
| S / H                    | Stop                                                        |
| Left-click a unit        | Inspect it                                                  |
| F1                       | Select and centre on your hero                              |
| Space (hold)             | Keep the camera on your hero                                |
| F9                       | Pause                                                       |
| Screen edge, middle-drag | Pan                                                         |
| Wheel                    | Zoom                                                        |
| `[` / `]`                | Turn the view 90°                                           |

The gauge (CT) fills only while you stand still; every action empties it and gives 10 MP. Fira
charges for 2 s: the mage stands until it lands, and its area shows red to everyone. Items
(ZXCVBN) come later.

## Built on

- [`dota-cartographer`](../dota-cartographer): extracts the map to `out/dota_map.json`
- [`dota-tactics-grid`](../dota-tactics-grid): the board (terrain, trees, buildings, picking,
  renderer), imported as a workspace package
- [`threlte-tactics`](../threlte-tactics): the Liquid Fire tactics engine port, for its ideas
  (ability pipeline, stat modifiers, status effects)
