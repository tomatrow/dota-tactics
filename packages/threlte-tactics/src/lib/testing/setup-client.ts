// Setup for the browser-mode (`client`) Vitest project.
import { act, cleanup } from "@threlte/test"
import { afterEach } from "vitest"

// Unmount scenes rendered with `@threlte/test` between tests. (`vitest-browser-svelte` cleans up
// after itself.)
afterEach(async () => {
	await act()
	cleanup()
})
