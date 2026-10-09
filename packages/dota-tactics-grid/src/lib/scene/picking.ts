export interface Vec3 {
	x: number
	y: number
	z: number
}

export interface ColumnHit {
	col: number
	row: number
	/** Distance along the ray (in units of `direction`). */
	t: number
	face: "top" | "side"
}

/**
 * Casts a ray against the board's tile columns by walking the grid cell by cell (Amanatides–Woo).
 * Exact for columns, and cheap: it visits only the cells under the ray, instead of testing every
 * triangle of the terrain mesh.
 *
 * Scene conventions are as in `coords.ts`: tile (col, row) covers X ∈ [col - cols/2, …+1] and
 * Z ∈ [rows/2 - row - 1, …+1]. `top(col, row)` is the column's top in scene units, NaN for no ground.
 * `bottom` is where columns start, `ceiling` the highest top.
 */
export function pickColumn(
	origin: Vec3,
	direction: Vec3,
	cols: number,
	rows: number,
	top: (col: number, row: number) => number,
	bottom: number,
	ceiling: number
): ColumnHit | null {
	// Grid space: u along columns, v along rows (north), y up.
	const o = [origin.x + cols / 2, rows / 2 - origin.z, origin.y]
	const d = [direction.x, -direction.z, direction.y]
	const lo = [0, 0, bottom]
	const hi = [cols, rows, ceiling]

	let tEnter = 0
	let tExit = Infinity
	// Which slab the ray entered through last; entering through the ceiling lands on a top.
	let enterAxis = -1
	for (let axis = 0; axis < 3; axis++) {
		if (Math.abs(d[axis]) < 1e-12) {
			if (o[axis] < lo[axis] || o[axis] > hi[axis]) return null
			continue
		}
		let a = (lo[axis] - o[axis]) / d[axis]
		let b = (hi[axis] - o[axis]) / d[axis]
		if (a > b) [a, b] = [b, a]
		if (a > tEnter) {
			tEnter = a
			enterAxis = axis
		}
		tExit = Math.min(tExit, b)
	}
	if (tEnter > tExit) return null

	const clamp = (v: number, n: number) => Math.min(n - 1, Math.max(0, v))
	let col = clamp(Math.floor(o[0] + d[0] * tEnter), cols)
	let row = clamp(Math.floor(o[1] + d[1] * tEnter), rows)
	const stepCol = d[0] > 0 ? 1 : -1
	const stepRow = d[1] > 0 ? 1 : -1
	const deltaCol = d[0] === 0 ? Infinity : Math.abs(1 / d[0])
	const deltaRow = d[1] === 0 ? Infinity : Math.abs(1 / d[1])
	let nextCol = d[0] === 0 ? Infinity : (col + (d[0] > 0 ? 1 : 0) - o[0]) / d[0]
	let nextRow = d[1] === 0 ? Infinity : (row + (d[1] > 0 ? 1 : 0) - o[1]) / d[1]

	let t = tEnter
	for (;;) {
		const tLeave = Math.min(nextCol, nextRow, tExit)
		const h = top(col, row)
		if (!Number.isNaN(h)) {
			// Entering below the top means the ray hit this column's side; leaving below it, the top.
			if (o[2] + d[2] * t <= h) {
				return { col, row, t, face: t === tEnter && enterAxis === 2 ? "top" : "side" }
			}
			if (o[2] + d[2] * tLeave <= h) return { col, row, t: (h - o[2]) / d[2], face: "top" }
		}
		if (tLeave >= tExit) return null
		if (nextCol < nextRow) {
			col += stepCol
			t = nextCol
			nextCol += deltaCol
		} else {
			row += stepRow
			t = nextRow
			nextRow += deltaRow
		}
		if (col < 0 || row < 0 || col >= cols || row >= rows) return null
	}
}
