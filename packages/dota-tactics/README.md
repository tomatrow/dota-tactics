# dota-tactics

Final Fantasy Tactics Advance rules on the real Dota 2 map: races and jobs, abilities learned
from equipment, facing and height — with Dota's lanes, creep waves, towers and Ancient. One hero
per player, real-time with an ATB gauge.

The design is in [DESIGN.md](./DESIGN.md); conventions are in [AGENTS.md](./AGENTS.md).

**Status:** milestone 6, the last of the prototype slice (`DESIGN.md` §11). You play a Bangaa
Warrior or a Nu Mou Black Mage in the mid lane against the AI playing the other: walk from the
Clan Hall, last-hit and deny the creep waves, fight with the Warrior's techniques or the mage's
Fire, Blizzard and Fira, kill the enemy hero, and win by destroying the enemy's mid T1. The
tuning window shows how both heroes spend their time and changes any number while you play.
Everything runs on a deterministic 20 Hz simulation. `?seed=123` replays a game's creeps and
rolls, `?job=blackMage` picks your hero and `?side=dire` your side (or use the controls window),
and `?tune=` starts a game with changed numbers.

## Usage

Node and pnpm are pinned in the repo-root `mise.toml`.

```sh
pnpm install                 # from the repo root, once
cd packages/dota-tactics
pnpm dev                     # http://localhost:5173
```

| Script                        | What it does                                                             |
| ----------------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`                    | Dev server                                                               |
| `pnpm build` / `pnpm preview` | Static site in `build/`                                                  |
| `pnpm check`                  | svelte-check and TypeScript                                              |
| `pnpm lint` / `pnpm format`   | Prettier and ESLint                                                      |
| `pnpm test`                   | Vitest unit tests (Node)                                                 |
| `pnpm lane-sim`               | Headless mid lane, no heroes; prints timings (`--minutes`, `--seeds`)    |
| `pnpm duel-sim`               | Headless games, the AI on both heroes; prints who won and how (`--tune`) |

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
| F9 / F10                 | Pause (resumes at its speed) / step one tick                |
| `` ` `` (backtick)       | The tuning window                                           |
| Screen edge, middle-drag | Pan                                                         |
| Wheel                    | Zoom                                                        |
| `[` / `]`                | Turn the view 90°                                           |

The gauge (CT) fills only while you stand still; every action empties it and gives 10 MP. Fira
charges for 2 s: the mage stands until it lands, and its area shows red to everyone. Items
(ZXCVBN) come later.

## Tuning

The tuning window (top right, or the backtick key) is for playtests (`DESIGN.md` §11's two
questions):

- **Time**: for you and the AI, how much of the time you walk, charge, stand with a full gauge or
  cast; actions a minute; and how long a full gauge waits before you act. If you nearly always
  act the moment it fills, the cadence is too slow. Restart counts afresh after a change.
- **Numbers**: every number the game plays by (rules, heroes, abilities, statuses, creeps,
  Sentinels). A change applies from the next tick, to this game. The game's links, and "New game
  with these", carry the changes as `?tune=path:value,…`; Reset all goes back to the defaults.
- **Copy** puts a note on the clipboard: the seed, the heroes, what's tuned, the telemetry and a
  link to play again with the same numbers.

`pnpm duel-sim --tune tuning.walkCharge:50` tries numbers headless, the AI on both heroes. A
number worth keeping goes into `DESIGN.md`, then `src/lib/content/`.

## Built on

- [`dota-cartographer`](../dota-cartographer): extracts the map to `out/dota_map.json`
- [`dota-tactics-grid`](../dota-tactics-grid): the board (terrain, trees, buildings, picking,
  renderer), imported as a workspace package
- [`threlte-tactics`](../threlte-tactics): the Liquid Fire tactics engine port, for its ideas
  (ability pipeline, stat modifiers, status effects)
