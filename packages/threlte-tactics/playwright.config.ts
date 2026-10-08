import { defineConfig, devices } from "@playwright/test"

/** End-to-end tests: the built game in a real browser (`pnpm test:e2e`). */
export default defineConfig({
	testDir: "e2e",
	forbidOnly: !!process.env.CI,
	reporter: "list",
	use: {
		...devices["Desktop Chrome"],
		// The game's reference resolution (and cheaper to render than the default 1280 × 720).
		viewport: { width: 640, height: 480 },
		baseURL: "http://localhost:4173"
	},
	webServer: {
		command: "pnpm build && pnpm preview --port 4173 --strictPort",
		url: "http://localhost:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
})
