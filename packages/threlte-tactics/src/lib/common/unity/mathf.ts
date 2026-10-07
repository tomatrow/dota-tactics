/** Unity's `Mathf.Epsilon` is the smallest float; `Approximately` uses `Epsilon * 8`. */
const epsilon8 = 1.1920929e-7 * 8

/** Unity's `Mathf.Approximately`: equal within a tiny, magnitude-relative tolerance. */
export function approximately(a: number, b: number): boolean {
	return Math.abs(b - a) < Math.max(1e-6 * Math.max(Math.abs(a), Math.abs(b)), epsilon8)
}
