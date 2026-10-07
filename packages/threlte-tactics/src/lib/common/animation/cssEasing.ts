import type { Easing } from "./Tweener.ts"

/**
 * An easing curve as a CSS `linear()` timing function, for decorative loops that run as CSS
 * animations. Like `EasingControl`, CSS plays the curve backwards on `alternate` iterations.
 */
export function cssEasing(easing: Easing, samples = 32): string {
	const stops = Array.from({ length: samples + 1 }, (_, i) => +easing(i / samples).toFixed(4))
	return `linear(${stops.join(", ")})`
}
