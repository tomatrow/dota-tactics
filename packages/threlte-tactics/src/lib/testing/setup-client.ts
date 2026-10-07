// Setup for the browser-mode (`client`) Vitest project.
import { act, cleanup } from "@threlte/test"
import { afterEach, vi } from "vitest"

afterEach(async () => {
	// Undo `useFakeTime` (`#lib/testing/time.ts`) first: unmounting needs real frames. Let
	// leftover tweens finish on the fake clock before that: svelte's animation loop would
	// otherwise wait forever on a fake frame, freezing every later tween in the file.
	if (vi.isFakeTimers()) {
		await vi.advanceTimersByTimeAsync(60_000)
		vi.useRealTimers()
	}
	// Unmount scenes rendered with `@threlte/test`. (`vitest-browser-svelte` cleans up after
	// itself.)
	await act()
	cleanup()
})
