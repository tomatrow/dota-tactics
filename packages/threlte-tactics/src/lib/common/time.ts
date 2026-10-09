/** Waits for `async` sequences: game time runs on these (tests fake them). */

/** Resolves on the next frame. */
export function nextFrame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

/** Resolves after `seconds`. */
export function wait(seconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}
