/** Unity's `Mathf.Epsilon` is the smallest float; `Approximately` uses `Epsilon * 8`. */
const epsilon8 = 1.1920929e-7 * 8

/** Unity's `Mathf.Approximately`: equal within a tiny, magnitude-relative tolerance. */
export function approximately(a: number, b: number): boolean {
	return Math.abs(b - a) < Math.max(1e-6 * Math.max(Math.abs(a), Math.abs(b)), epsilon8)
}

/** C#'s `int.MaxValue`. */
export const intMaxValue = 2_147_483_647

/** Unity's `Mathf.Clamp`. */
export function clamp(value: number, min: number, max: number): number {
	if (value < min) return min
	if (value > max) return max
	return value
}

/** Unity's `Mathf.Clamp01`. */
export function clamp01(value: number): number {
	return clamp(value, 0, 1)
}

/** Unity's `Mathf.Lerp`: `t` is clamped to [0, 1]. */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * clamp01(t)
}
