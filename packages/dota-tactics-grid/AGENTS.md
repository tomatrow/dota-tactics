# dota-tactics-grid

A Threlte + SvelteKit view of the real Dota 2 map as a tactics board (see `README.md`). It is
growing into a playable board, so the scene is built from components that read shared state.

## Workflow

- `pnpm lint`, `pnpm check` and `pnpm test` must be green before every commit. Commit on `master`;
  never push.
- Check changes to the scene in a headless browser before committing: screenshots of the same
  views before and after, and frame times with AO on at retina size.

## Code style

- Comments say what the code does and why it must, in the present tense. No history ("used
  to…", "instead of…"): git holds that.
- Component callback props and DOM handlers are lowercase (`onclick`). Class members are camelCase.
- Import through `#lib/...` with the real file extension (`#lib/scene/coords.ts`).

## Architecture

- **State lives in runes classes** in `.svelte.ts` modules. `ViewerState` (`#lib/state.svelte.ts`)
  holds the map, what the windows and the scene both read (layer, visibility, height scale,
  hover, pin) and the camera controls. It is shared with `createContext` (`getViewerState()`),
  one per viewer, never as a module-level singleton.
- **Components render; they don't own rules.** The DOM windows are in `src/lib/components/`; the 3D
  scene is in `src/lib/components/scene/`, with one component per entity kind in
  `scene/entities/`.
- **Builders stay plain TypeScript** in `src/lib/scene/` and `src/lib/map/`: anything data-heavy or
  worth a Node test (tile columns, picking, tree placement, lane paths, layer colours, the terrain's
  grid shader). Components call them and own what they build.
- **The scene is `<T>` markup.** Where `@threlte/extras` has a component for the job, use it
  (`CameraControls`, `Environment`, `HTML`, `MeshLine`).
- **Per-frame work is a `useTask`.** The canvas renders every frame (`renderMode="always"`): the
  water and crystals animate.
- **Rendering** is `Renderer.svelte`'s task on the render stage: three's `EffectComposer` with a
  cached GTAO pass, then SMAA. The board is static, so the shadow map and the AO's G-buffer are
  only re-rendered when the camera moves or shapes change. State that changes shapes goes in
  `Renderer.svelte`'s "shapes changed" effect.
- **Picking** walks the grid along the pointer's ray (`pickColumn`) and ray-casts only the entity
  groups, in its own stage after the camera controls and before drawing. Never ray-cast the
  terrain (a million triangles) or turn on `interactivity()`.
- **Coordinates**: scene units are tiles, Y up, east +X, north −Z (`#lib/scene/coords.ts`). Map
  data stays in game units.

## Threlte gotchas

- `<T.X>` only instantiates `X` when its source starts with `class `. Minified base classes
  (`Color`, `Vector3`, `Fog`…) start `class{`, so in a production build `<T.Color>` hands over
  the class itself. Pass an instance with `is`.
- A function prop named `on…` becomes an event listener when the target has
  `addEventListener`, and materials do: set `onBeforeCompile` in TypeScript, not as a prop.
- `<HTML>` only applies `pointerEvents` in transform mode. Labels that mustn't catch clicks get
  `style="pointer-events: none"`.
- Props are lazy getters: build geometries and other objects in the script, not in a prop
  expression, or every read builds a new one.
- Threlte disposes what's mounted with `<T>` (including `is`), counting references. Objects passed
  as props (`geometry={…}`, a texture) aren't disposed: mount them as children
  (`<T attach="normalMap" is={…} />`) or dispose them yourself.
- An `<Instance>` per object doesn't scale to thousands: 2,483 trees held the first frame back by
  1.6 s. Use a `<T.InstancedMesh>` and write its matrices in an effect.
- A `manual` camera's projection isn't updated when its props change: call
  `updateProjectionMatrix()` yourself.
- camera-controls bases each wheel step on the zoom reached so far, not the target zoom.
  Screenshot scripts let each step settle before the next.
