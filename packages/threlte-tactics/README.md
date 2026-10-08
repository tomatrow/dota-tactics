# threlte-tactics

A [Threlte](https://threlte.xyz) + [SvelteKit](https://svelte.dev/docs/kit) port of
[The Liquid Fire](https://theliquidfire.com)'s Unity
[Tactics RPG](https://theliquidfire.com/category/projects/tactics-rpg/) tutorial (in
`../tactics-rpg`). Progress is tracked in [PORTING.md](./PORTING.md); conventions in
[AGENTS.md](./AGENTS.md).

## Developing

```sh
pnpm install
pnpm test:install-browsers # once: Playwright Chromium for browser-mode tests
pnpm dev
```

| Script          | What it does                                         |
| --------------- | ---------------------------------------------------- |
| `pnpm dev`      | Vite dev server                                      |
| `pnpm build`    | Static build (`adapter-static`) into `build/`        |
| `pnpm check`    | `svelte-check`                                       |
| `pnpm lint`     | Prettier + ESLint                                    |
| `pnpm format`   | Prettier write                                       |
| `pnpm test`     | Vitest (browser-mode `client` + Node `server` tests) |
| `pnpm test:e2e` | Playwright: plays a whole battle in the built game   |

## Controls

| Action  | Keys               |
| ------- | ------------------ |
| Move    | Arrows / WASD      |
| Confirm | Enter / Space      |
| Cancel  | Escape / Backspace |

## Credits

- Original tutorial, code and assets: Jonathan Parham, [The Liquid Fire](https://theliquidfire.com).
- Music: “Strategy RPG Battle” (intro and loop) by Brennan Anderson, licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); transcoded from WAV to AAC
  (`scripts/transcode-music.sh`).
