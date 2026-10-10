import adapter from "@sveltejs/adapter-static"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				// The board's components come from the dota-tactics-grid workspace package, which
				// resolves outside node_modules, so they get runes mode too.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true
			},
			// Fully client-rendered: the one route is prerendered as an empty shell (see src/routes/+layout.ts).
			adapter: adapter()
		})
	],
	// No `server.fs.allow`: Vite then allows the whole pnpm workspace, which covers the board's
	// sources in dota-tactics-grid and the map data in dota-cartographer/out.
	test: {
		expect: { requireAssertions: true },
		environment: "node",
		include: ["src/**/*.test.ts", "scripts/**/*.test.ts"]
	}
})
