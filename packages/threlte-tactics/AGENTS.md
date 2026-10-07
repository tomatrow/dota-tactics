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
  throwaway tutorial demo code.
- One or more commits per part, imperative messages: `Port part 6: path finding`. Commit on
  `master`; never push.
- `pnpm lint`, `pnpm check` and `pnpm test` must be green before every commit.
- Keep `PORTING.md` up to date: part status, Unity → port file map, divergences.

## Fidelity rules

- Unity code wins. Port behaviour, numbers and timings (tween durations, AI delays) exactly.
- Only fix crashes / clear bugs. Mark each with `// PORT-FIX: <why>` and log it in `PORTING.md`.
- Visuals match "at a glance" (primitives, materials, ortho camera size 5, warm directional
  light with soft shadows), not pixel-perfect.

## Architecture

- **Rules live in runes classes** in `.svelte.ts` modules. Not plain TS, not renderless
  components.
  - `$state` only on fields that drive rendering/UI. Plain fields for pure rules data.
    `$state.raw` for large reassigned collections; `SvelteMap` for the board's tiles.
  - Share via `createContext` (one battle = one context), never module-level singletons.
- **Components render; they don't own rules.** Threlte and DOM views live in
  `src/lib/components/` (PascalCase `.svelte`).
- **GetComponent/AddComponent → typed fields.** E.g. `unit.stats`, `unit.health`, `unit.job`,
  `unit.status.effects`, `ability.range`, `ability.effects: { hitRate, effect, target }[]`.
  Unity class hierarchies (ranges, areas, effects, status effects, movement) stay TS classes.
  Dynamic Unity children (status effects, features, equipment) become lists queried by class.
- **NotificationCenter** is kept: typed (notification name → payload map), one instance per
  battle (context), synchronous, listeners may mutate payloads (`BaseException`,
  `ValueChangeException`…), sender filtering and add/remove-during-dispatch semantics as Unity.
- **State machine**: `runic-svelte-fsm`, owned by `BattleController`.
  - Each Unity state is a module exporting a handler-object factory taking the battle context.
  - Input arrives as `move(p)` / `fire(i)` actions; the Human-driver guard lives there
    (replaces `AddListeners`/`RemoveListeners`). `*` holds no-op defaults.
  - `BaseAbilityMenuState` → a shared factory spread into the three menu states.
  - Async completions are explicit typed actions (e.g. `machine.done()`). Nested transitions
    are allowed; where Unity relied on its ignore-during-transition guard, defer explicitly.
- **Coroutines**: `TurnOrderController.Round()` → JS generator. Animated sequences → `async`
  functions awaiting `svelte/motion` `Tween`s (`svelte/easing`; hand-port a curve only if
  missing). Per-frame behaviour → Threlte `useTask`.
- **Randomness**: one injectable seeded PRNG; `?seed=` overrides.
- **Enums**: `as const` numeric objects + derived union types. No TS `enum`.
- **Layout**: mirror Unity folders in kebab-case under `src/lib/` (`controller/battle-states/`,
  `view-model-component/ability/range/`, `common/notification-center/`…); files keep Unity
  class names (`ConeAbilityRange.svelte.ts`); methods camelCase. Import via `#lib/...`.
- **Data**: `scripts/convert-unity.ts` (`pnpm convert`) turns Unity YAML/CSV into committed,
  generated `.ts` modules (`satisfies` our types) in `src/lib/data/generated/`. Never edit
  generated files by hand. The 12 abilities and 3 attack patterns are hand-written TS.
- **Assets**: imported from `src/lib/assets/` (hashed, type-checked).

## Views & input

- `/` is the battle. `<Battle>` creates the `BattleController` + notification center, provides
  them via context, and renders the Threlte `<Canvas>` (`renderMode="on-demand"`) plus a DOM
  overlay for UI.
- UI (uGUI) → DOM overlay scaled from the 640×480 reference resolution (match height). Reuse the
  original PNGs (`border-image` 9-slicing). `Panel`/`LayoutAnchor` → a `<Panel>` with named
  positions and tweened transitions. `FacingIndicator` stays 3D.
- Input: one `<Input>` component via `<svelte:window>`. Move: arrows/WASD with Unity's repeater
  (0.5 s threshold, 0.25 s rate). Confirm (Fire1): Enter/Space. Cancel (Fire2): Escape/Backspace.
- Audio: Web Audio, gapless intro → loop, starts on first key press. Music is CC-BY (credit in
  README and in-app).

## Testing

- Vitest, two projects (see `vite.config.ts`):
  - `client` (browser mode, Playwright Chromium): `src/**/*.svelte.test.ts`. Use this for anything
    touching runes, rules classes or components (incl. Threlte scenes).
  - `server` (Node): `src/**/*.test.ts`, `scripts/**/*.test.ts` for plain TS (e.g. the converter).
- Rules logic (pathfinding, stats/modifiers, turn order, hit rate, damage, AI) gets thorough
  tests with expectations derived from the C#. Components get light smoke tests.
- Playwright e2e is added once a battle is playable.
- Visual checks: the browser-tools skill.
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
