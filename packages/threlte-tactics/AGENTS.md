## Project Packages

- tactics-rpg
  - The Liquid Fire's Unity (5.3) "Tactics RPG" tutorial, finished state. **Source of truth.**
  - Blog series (26 posts): https://theliquidfire.com/category/projects/tactics-rpg/
- GodotTactics
  - The same author's in-progress Godot 4 port (stops around part 19, Magic). Reference for
    "how someone translated this out of Unity" only; its extras (orbit camera, i18n, knockback…)
    are out of scope.
- threlte-tactics
  - Threlte + SvelteKit port of tactics-rpg (current goal of this repo).

## Goal

A faithful, working port of the finished Unity tutorial. Done = the full `Battle.unity` loop on
`Level_0`: intro conversation → player + AI turns (menus, abilities, status effects) → win/lose
outro → end of battle. Desktop evergreen browsers, keyboard only.

Out of scope until parity (backlog): Godot extras, mouse/touch/gamepad, mobile layout, CI.
Deferred: Board Creator (`/dev/board-creator`). Dropped: the Anchored UI demo scene.

## Workflow

- Port the blog parts in chronological order (see `PORTING.md`). Read each blog post before
  porting it.
- Port the **final** Unity version of each file at the part where it first appears; skip
  throwaway tutorial demo code. Where the final version depends on parts not ported yet, port
  the version from that part's commit in
  [theliquidfire/blogtacticsrpg](https://github.com/theliquidfire/blogtacticsrpg) (one commit per
  post) and evolve it as later parts land.
- One or more commits per part, imperative messages: `Port part 6: path finding`. Commit on
  `master`; never push.
- `pnpm lint`, `pnpm check` and `pnpm test` must be green before every commit; `pnpm test:e2e`
  too before a commit that changes the battle flow (and at milestones).
- Keep `PORTING.md` up to date: part status, Unity → port file map, Divergences, Translations.

## Fidelity rules

- **Faithful behaviour, idiomatic code.** The rules are exact: formulas (integer division
  included), numbers, state flow, and the AI's choices for a seed. Presentation (animations,
  timings, layout, colors) matches at a glance. Use Unity's numbers where they come for free
  (tween durations, AI delays, easing), but never add machinery just to reproduce a detail of
  Unity's look or motion. Write it the way TS, Svelte and three would. Don't emulate Unity or C#
  mechanisms (left-handed space, Euler-degree tweens, `int.MaxValue` sentinels, `Mathf`, uGUI
  layout, `Awake`/`OnEnable`).
- Don't reproduce C#/.NET platform quirks (32-bit floats, int limits, unstable sorts) unless the
  player could tell. Tests derive expected values from the formula.
- **Keep the structure.** Game code (Model, View Model Component, Controller, Factory, Enums,
  Exceptions, Extensions) keeps Unity's classes, names and folders. The blog's `Common/` helpers
  are mechanism: swap them for idiomatic equivalents that keep their behaviour.
- Only fix crashes and clear bugs. Log each in `PORTING.md` › Divergences, with a test that pins
  it. Log mechanism swaps in › Translations.
- Visuals match at a glance (primitives, materials, ortho camera size 5, warm directional light
  with soft shadows), not pixel for pixel.

## Code style

- Comments say what the code does and why it must, in the present tense. No history ("Unity
  does…", "instead of…", "we chose…"): git and `PORTING.md` hold that. A ported file's header
  names its source: "Port of `X.cs`".
- Component callback props and DOM handlers are lowercase (`oncomplete`). Class members are
  camelCase. Lifecycle is `enable()`/`disable()`/`disableLater()`.
- Rules classes: `$state` as a field or the first assignment in the constructor. Methods handed
  out as callbacks are arrow-function fields. No `$effect`: rules objects outlive component setup.

## Architecture

- **Rules live in runes classes** in `.svelte.ts` modules. Not plain TS, not renderless
  components.
  - `$state` only on fields that drive rendering/UI. Plain fields for pure rules data.
    `$state.raw` for large reassigned collections; `SvelteMap` for the board's tiles.
  - Share via `createContext` (one battle = one context), never module-level singletons.
- **Components render; they don't own rules.** Threlte and DOM views live in
  `src/lib/components/` (PascalCase `.svelte`).
- **GetComponent/AddComponent → typed fields.** E.g. `unit.stats`, `unit.health`, `unit.job`,
  `unit.status`, `ability.range`, `ability.effects: { hitRate, effect, target }[]`.
  Unity class hierarchies (ranges, areas, effects, status effects, movement) stay TS classes.
  Dynamic Unity children (status effects, features, equipment) become lists queried by class
  (`unit.status.getEffect(KnockOutStatusEffect)` for `GetComponentInChildren<…>()`).
- **Component lifetimes**: a component added and removed at runtime has `onEnable()` /
  `onDisable()` (Unity's `OnEnable`/`OnDisable`, e.g. to observe notifications), called by
  whatever adds it. Unity's `Destroy` → `destroy(component)` (`#lib/common/unity/Object.ts`):
  like Unity's, it disables the component only once the code running now has finished.
- **Prefabs** that game code instantiates are data plus a function or constructor that builds
  the components (`JobPrefab` → `new Job`, `AbilityPrefab` → `instantiateAbility`,
  `AttackPatternPrefab` → `instantiateAttackPattern`). A component
  gets what Unity's would find through `GetComponentInParent` in its constructor (e.g. its
  unit); one that needs its GameObject's parent or siblings is handed them by the parent's
  constructor (`attach`), which then enables it, like Unity's `Instantiate`.
- **NotificationCenter** is kept: one instance per battle (`battle.notifications`), passed to
  the constructors of the objects that post or observe; synchronous; listeners may mutate
  payloads (`BaseException`, `ValueChangeException`…); sender filtering and
  add/remove-during-dispatch semantics as Unity. Typed: a module that posts notifications
  augments the `Notifications` interface (name → `[sender, args]`, see `Stats.ts`). Handlers that
  get removed later are stable arrow-function fields (Unity compares delegates).
- **State machine**: `runic-svelte-fsm`, owned by `BattleController` (`createStateMachine`).
  - Each Unity state is `controller/battle-states/<UnityName>.ts` exporting a factory
    (`moveTargetState(owner)`) whose handlers `satisfies BattleStateHandlers`. Register it in
    `createStateMachine` and add its name to `BattleStateName`. Handlers return the next state's
    name (Unity's `owner.ChangeState<T>()`). Unity's base-class helpers (`SelectTile`…) are
    functions in `BattleState.ts` taking `owner`.
  - The machine starts in `None` (Unity: no current state); `battle.start()` is Unity's `Start`.
  - Input arrives as `move(p)` / `fire(i)` actions, through `BattleController.move`/`fire`,
    which drop it while the computer drives the actor (Unity's `AddListeners`/`RemoveListeners`).
    A state's computer-driven path is an `async` function started from `_enter` that ends
    with `owner.machine.done()`; the state's `done` handler picks the next state.
  - `BaseAbilityMenuState` → `baseAbilityMenuState(owner, { loadMenu, confirm, cancel })` (its
    abstract methods), spread into the three menu states. A state's own fields are variables in
    its factory; Unity statics shared between states are `BattleController` fields.
  - Async completions are explicit typed actions (e.g. `machine.done()`). Nested transitions
    are allowed; where Unity relied on its ignore-during-transition guard, defer explicitly.
- **Coroutines**: `TurnOrderController.Round()` → JS generator. Animated sequences → `async`
  functions awaiting `svelte/motion` `Tween`s (`svelte/easing`; hand-port a curve only if
  missing); `yield return null` / `WaitForSeconds` → `nextFrame()` / `wait()`
  (`#lib/common/time.ts`). Per-frame behaviour → Threlte `useTask` (with
  `autoInvalidate: false` + `invalidate()` when something moved, so on-demand rendering idles).
- **Transforms** that game code moves (the tile selection indicator, units and their `Jumper`)
  are `Transform` instances (`#lib/common/Transform.svelte.ts`): `position`, `yaw` (radians about
  Y; nothing else rotates) and `scale`, in world space; views render them. Assigning snaps;
  `moveTo`/`rotateTo`/`scaleTo` tween and return a promise that resolves on completion. Don't
  overlap tweens on the same property: an interrupted `Tween`'s promise never resolves.
- **Unused parameters** kept for Unity's signatures (base virtuals) get a `_` prefix.
- **Randomness**: one injectable seeded PRNG for the whole game (it outlives a battle, like
  Unity's); `?seed=` overrides.
- **Coordinates**: three's (right-handed, Y up). Board point `(x, y)` at height `h` is world
  `(x, h × 0.25, −y)`: North is −Z, East +X. `Tile` is where board space becomes world space
  (`center`, `position`); level data stays in board space. Unity's left-handed values convert once,
  by hand: negate Z positions and Y rotations (a facing `d` is `toYaw(d)`).
- **Enums**: `as const` numeric objects + derived union types. No TS `enum`.
- **Layout**: mirror Unity folders in kebab-case under `src/lib/` (`controller/battle-states/`,
  `view-model-component/ability/range/`, `common/notification-center/`…); files keep Unity
  class names (`ConeAbilityRange.svelte.ts`); methods camelCase. Import via `#lib/...` with the
  real file extension (`#lib/materials/materials.ts`).
- **Data**: `src/lib/resources/` mirrors Unity's `Assets/Resources` (same names and paths); load
  with `Resources.load("Levels/Level_0")` (`#lib/common/Resources.ts`, typed by folder).
  `scripts/convert-unity.ts` (`pnpm convert`) turns Unity YAML/CSV into committed `.ts` modules
  (`satisfies` our types) in the folders it owns (`generatedFolders`); never edit those by hand.
  A test fails when they are stale. Prefabs that are data (abilities) are generated too, each
  component as `{ type: "<C# class>", ...inspectorFields }`. `scripts/` runs on Node's native TypeScript: erasable syntax, `.ts` imports.
- **Assets**: imported from `src/lib/assets/` (hashed, type-checked).
- **Rendering**: Unity's Gamma color space is reproduced with color management off and linear
  output (see `Battle.svelte`), so material/light colors are the raw Unity values. three lights
  are physically based: Unity intensity `i` → three intensity `i * Math.PI`.
- **Naming views**: a component that renders a rules class is `<Class>View.svelte`
  (`BoardView.svelte` renders `Board`); pure view components (`CameraRig.svelte`) keep Unity's name.

## Views & input

- `/` is the battle. `<Battle>` creates the `BattleController` (which owns the notification
  center and the PRNG), provides it via context, and renders the Threlte `<Canvas>` (`renderMode="on-demand"`) plus a DOM
  overlay for UI.
- UI (uGUI) → DOM overlay. Each Unity canvas prefab → content inside a `<UICanvas>`
  (`#lib/components/ui/`: Canvas + CanvasScaler, laid out in 640×480 reference pixels, match
  height). Port prefab hierarchies with `<RectTransform>` (the prefab's anchors, pivot, position,
  size and scale, verbatim), `<UIImage>` (sprites from `sprites.ts`, `Sliced` 9-slicing, `Filled`
  horizontally) and `<UIText>` (alignment, font style, color, Best Fit, `Shadow`). Unity's `Panel` →
  a `Panel` (`#lib/common/ui/Panel.ts`, positions as data) rendered by `<PanelView>`;
  `setPosition(name, animated, { duration, equation })` returns the completion promise (Unity's
  `completedEvent`; never resolves if interrupted). `FacingIndicator` stays 3D.
- Input: one `<Input>` component via `<svelte:window>`. Move: arrows/WASD with Unity's repeater
  (0.5 s threshold, 0.25 s rate). Confirm (Fire1): Enter/Space. Cancel (Fire2): Escape/Backspace.
- Audio: Web Audio (`#lib/common/audio.ts`). `+page.svelte` owns the one `AudioContext`
  (Unity's audio engine) and resumes it on the first key press; `<Battle audio>` renders
  `<Music>`, a `MusicPlayer` (intro, then loop) that stops when the battle ends. Without `audio`
  (tests), no music. Music is CC BY 4.0: keep the credit in README and in-app (the page footer).
  Re-encode with `scripts/transcode-music.sh`.

## Testing

- Vitest, two projects (see `vite.config.ts`):
  - `client` (browser mode, Playwright Chromium): `src/**/*.svelte.test.ts`. Use this for anything
    touching runes, rules classes or components (incl. Threlte scenes).
  - `server` (Node): `src/**/*.test.ts`, `scripts/**/*.test.ts` for plain TS (e.g. the converter).
- 3D components: `@threlte/test`'s `render` (queries the three `Scene` directly).
- Audio: render on an `OfflineAudioContext` and compare samples (`#lib/testing/audio.ts`: a rate
  where schedules land exactly on frames, ramps that tell each sample's origin).
- Animated rules (tweens, `nextFrame`, `wait`) are tested on fake clocks:
  `useFakeTime()` + `await advance(seconds)` (`#lib/testing/time.ts`). Read its caveat about
  mixing real and fake time in one file.
- Battles in tests: `new BattleController(level, { seed, spawnTestUnits: spawn(...) })`
  (`#lib/testing/spawn.ts`) puts particular units in particular places instead of
  `InitBattleState`'s random ones.
- Rules logic (pathfinding, stats/modifiers, turn order, hit rate, damage, AI) gets thorough
  tests with expectations derived from the C#'s formulas. Components get light smoke tests.
- e2e (`pnpm test:e2e`, Playwright, `e2e/`): builds and previews the game, then plays a whole
  battle by keyboard on a fake clock (`page.clock`, jumped a frame at a time; about a minute).
  It reads the UI by its canvases' regions (`<UICanvas name>`). Press keys a frame apart: input
  is read per frame, as in Unity.
- Visual checks: a headless browser (Playwright's Chromium with `--headless=new`, driven over
  CDP by puppeteer-core from the browser-tools skill). Never drive the user's own Chrome.
- First run: `pnpm test:install-browsers`.

## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm (strict catalog in `pnpm-workspace.yaml`: add versions there first)
- **Add-ons**: prettier, eslint (`svelte.configs.all`), vitest, ai-tools, experimental (async)

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
