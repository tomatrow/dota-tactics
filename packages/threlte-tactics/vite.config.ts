import adapter from "@sveltejs/adapter-static"
import { sveltekit } from "@sveltejs/kit/vite"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
				experimental: { async: true }
			},
			// Fully client-rendered: every route is prerendered as an empty shell (see src/routes/+layout.ts).
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		passWithNoTests: true,
		projects: [
			{
				// Anything touching runes or components runs in a real browser (client-compiled Svelte, WebGL).
				extends: true,
				test: {
					name: "client",
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: "chromium", headless: true }]
					},
					include: ["src/**/*.svelte.{test,spec}.ts"]
				}
			},
			{
				// Plain TS with no runes (e.g. the Unity data converter) runs in Node.
				extends: true,
				test: {
					name: "server",
					environment: "node",
					include: ["src/**/*.{test,spec}.ts", "scripts/**/*.{test,spec}.ts"],
					exclude: ["src/**/*.svelte.{test,spec}.ts"]
				}
			}
		]
	}
})
