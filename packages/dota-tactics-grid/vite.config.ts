import adapter from "@sveltejs/adapter-static"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true
			},
			// Fully client-rendered: the one route is prerendered as an empty shell (see src/routes/+layout.ts).
			adapter: adapter()
		})
	],
	server: {
		// The map data is the cartographer's output, a sibling package (see src/lib/map/load.ts).
		fs: { allow: ["../dota-cartographer/out"] }
	},
	test: {
		expect: { requireAssertions: true },
		environment: "node",
		include: ["src/**/*.{test,spec}.ts"]
	}
})
