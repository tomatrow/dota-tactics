/**
 * Unity coroutine yields as promises, for porting `IEnumerator` coroutines to `async` functions.
 */

/** Unity's `yield return null`: resolves on the next frame. */
export function nextFrame(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

/** Unity's `yield return new WaitForSeconds(seconds)`. */
export function waitForSeconds(seconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}
