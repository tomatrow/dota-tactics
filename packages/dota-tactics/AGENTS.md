# dota-tactics

FFTA rules on the real Dota 2 map, real-time with an ATB gauge. `DESIGN.md` is the source of
truth for the game; `README.md` says how to run it.

## Workflow

- Build the milestones in `DESIGN.md` §11 in order. Each ends playable or testable.
- Design decisions go in `DESIGN.md`: "decided" in the §2 table and the section it belongs to,
  proposals marked as such. Numbers live in the doc first, then in `src/lib/content/`.
- `pnpm lint`, `pnpm check` and `pnpm test` must be green before every commit. Commit on `master`;
  never push.
- Check scene changes in a headless browser: Playwright's Chromium with `--headless=new`, driven
  over CDP by puppeteer-core from the browser-tools skill. Never drive the user's own Chrome.
  Screenshots before and after, and frame times at retina size with AO on.

## Code style

- Comments say what the code does and why it must, in the present tense. No history: git holds
  that.
- Component callback props and DOM handlers are lowercase (`onclick`). Class members are camelCase.
- Import through `#lib/...` with the real file extension (`#lib/game/camera.ts`).

## Architecture

- **The board comes from `dota-tactics-grid`**, imported as `dota-tactics-grid/<path under its
src/lib>` (its `exports`). `Game.svelte` creates the `ViewerState` its components read. A change
  the game needs in a board component goes in the grid package, behind a prop that keeps the
  viewer working as before (e.g. `<Renderer dynamic>`).
- **The simulation is plain TypeScript** in `src/lib/sim/`: no Svelte, three or DOM. It runs at
  a fixed 20 ticks per second and is deterministic: time is an integer tick count, randomness
  comes from one seeded PRNG, units update in id order. No `Math.random`, `Date.now` or
  `performance.now` in the sim. It runs in Node tests and the headless scripts.
- **Content** (jobs, abilities, statuses, items, creeps, towers, tuning) is typed data in
  `src/lib/content/`, the one place the doc's numbers live in code. An ability is its target
  (self, enemy, tile), reach, area, charge time and an effect kind; the world resolves effects by
  kind (`World#resolve`), so a new ability of an existing kind is only data.
- **Players steer heroes with commands**: `world.command(heroId, command)`, plain data with units
  by id (`#lib/sim/commands.ts`), applied at the start of the next tick in the order given. A
  game replays from its seed and its (tick, hero, command) log; nothing else may reach into the
  sim's state during play.
- **`GameState`** (`#lib/game/GameState.svelte.ts`) is the runes class between the sim and the
  view: it advances the game each frame, turns input into commands to the player's hero and
  exposes what the HUD and scene read. Shared with `createContext`, one per game, never a
  module-level singleton.
- **Components render; they don't own rules.** DOM HUD in `src/lib/components/`, the 3D scene in
  `src/lib/components/scene/`. Pure helpers worth a Node test (camera maths, paths) are plain TS
  in `src/lib/game/`.
- **The scene mounts beside the `<canvas>`, not in it** (`GameCanvas.svelte`, in place of
  Threlte's `Canvas`). Svelte keeps comment anchors for every component and block, some 15,000;
  as children of a `<canvas>` Chrome makes each removal cost in proportion to their number, and
  a unit's view unmounting took ~25 ms.
- **Moving things don't cast shadows.** The board's shadow map is only re-rendered when the board
  changes; units get blob shadows. `<Renderer dynamic>` re-renders the AO G-buffer every frame,
  at a quarter resolution with 8 samples, and the canvas caps the pixel ratio at 1.5: AO at
  gameplay zoom is the frame's biggest cost.
- **Unit views read the sim directly** in a `useTask` each frame (positions, bars, flashes), not
  through Svelte state: `GameState` only makes the roster, selection, fallen buildings and the
  tick reactive. Overlays on top of the water (bars, rings, shadows) are transparent with a
  render order above the water's, or the water draws over them.
- **In development, `window.game`** is the `GameState`, for the console and headless checks
  (`game.speed = 0`, `game.selected = …`).
- **Input** follows Dota 2's default layout (`DESIGN.md` §11). Keys are in `Game.svelte`; the
  mouse on the board is `GameInput.svelte`, which picks units by where their bodies are on
  screen and ray-casts the clicked tile itself (the grid's picker only updates once a frame).
  The camera leaves the left and right mouse buttons to the game: wheel zooms, middle-drag pans,
  the view turns only in quarter turns.
- **Scene coordinates** are the grid's: 1 unit = 1 tile, Y up, north is −Z
  (`dota-tactics-grid/scene/coords.ts`).

## Testing

- Vitest in Node: `src/**/*.test.ts` and `scripts/**/*.test.ts`. Rules get thorough tests with
  expectations derived from the formulas in `DESIGN.md`; components get visual checks.
- Sim tests draw small boards as text (`#lib/testing/terrain.ts`) and turn waves off to place
  creeps by hand (`world.spawnCreep`; `waitingLane` keeps a creep where it's put). Heroes start
  at a Clan Hall tile the scenario gives. `#lib/testing/world.ts` has the world, run, until and
  trace helpers; `#lib/testing/map.ts` loads the real map in Node.
- Tuning numbers come from `pnpm lane-sim` (`scripts/lane-sim.ts`: the real map, many seeds,
  headless). Record what it measured in `DESIGN.md` next to the numbers it justified.
