import type { Terrain } from "#lib/sim/grid.ts"

/**
 * A terrain drawn as text, north at the top: `#` can't be walked on, `.` is level 0, a digit is
 * walkable ground at that level.
 */
export function terrain(lines: readonly string[]): Terrain {
	const rows = lines.length
	const cols = Math.max(...lines.map((line) => line.length))
	const walkable = new Uint8Array(cols * rows)
	const level = new Float32Array(cols * rows).fill(Number.NaN)
	lines.forEach((line, i) => {
		const row = rows - 1 - i
		for (let col = 0; col < line.length; col++) {
			const ch = line[col]
			if (ch === "#") continue
			walkable[row * cols + col] = 1
			level[row * cols + col] = ch === "." ? 0 : Number(ch)
		}
	})
	return { cols, rows, walkable, level }
}

/** An open rectangle of level-0 ground. */
export const openTerrain = (cols: number, rows: number): Terrain =>
	terrain(Array.from({ length: rows }, () => ".".repeat(cols)))
