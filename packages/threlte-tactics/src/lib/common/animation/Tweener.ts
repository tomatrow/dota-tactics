import type { Tween } from "svelte/motion"

/**
 * Port of the parts of `Common/Animation` (`EasingControl`, `Tweener`, `Vector3Tweener`) that the
 * game uses, on top of `svelte/motion`'s `Tween`. `EasingEquations` are `svelte/easing`'s
 * (`EaseInOutQuad` → `quadInOut`, `EaseOutBack` → `backOut`…).
 */

/** An easing curve: maps progress in [0, 1] to eased progress. */
export type Easing = (t: number) => number

/** How a looping tween plays again: from the start, or back the other way. */
export type LoopType = "Repeat" | "PingPong"

export interface LoopOptions {
	/** How many times to play again after the first play; negative loops forever. */
	loopCount?: number
	loopType?: LoopType
}

/** Plays `easing` backwards, the way `EasingControl` does when a ping-pong loop reverses. */
export function reversed(easing: Easing): Easing {
	return (t) => 1 - easing(1 - t)
}

/**
 * Tweens `target` from `start` to `end`. The returned promise resolves when the tween completes.
 *
 * @param duration Seconds per play.
 */
export async function tween<T>(
	target: Tween<T>,
	start: T,
	end: T,
	duration: number,
	easing: Easing,
	{ loopCount = 0, loopType = "Repeat" }: LoopOptions = {}
): Promise<void> {
	const ms = duration * 1000
	// Snapping is synchronous, so a later snap or tween of the same target in this tick wins.
	void target.set(start, { duration: 0 })

	let forward = true
	for (let loops = 1; ; ++loops) {
		await target.set(forward ? end : start, {
			duration: ms,
			easing: forward ? easing : reversed(easing)
		})
		if (loopCount >= 0 && loops > loopCount) return

		if (loopType === "Repeat") void target.set(start, { duration: 0 })
		else forward = !forward
	}
}
