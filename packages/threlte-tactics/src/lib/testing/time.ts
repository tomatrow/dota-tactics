// Fake game time for browser-mode tests: tweens (`svelte/motion`), `nextFrame` and
// `wait` all run on these clocks.
import { vi } from "vitest"

/**
 * Fakes the clocks for the rest of the current test (`setup-client.ts` restores them).
 *
 * Svelte's animation loop is per test file, and one that is already running on real frames
 * ignores the fake ones: don't fake time after a test in the same file left a tween running.
 */
export function useFakeTime(): void {
	vi.useFakeTimers({
		toFake: [
			"requestAnimationFrame",
			"cancelAnimationFrame",
			"performance",
			"setTimeout",
			"clearTimeout"
		]
	})
}

/** Runs the faked clocks forward (frames, timers, and the promises they settle). */
export async function advance(seconds: number): Promise<void> {
	await vi.advanceTimersByTimeAsync(seconds * 1000)
}
