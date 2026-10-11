import type { TilePoint } from "./lane-field.ts"

/**
 * A lane's path as a line to measure along, in tiles: how far down the lane a tile is (from its
 * spawner's end), and which tile is a given distance down it. Path points are in continuous tile
 * coordinates, where tile (col, row) spans [col, col + 1) × [row, row + 1).
 */
export class LaneLine {
	/** How far down the lane its end is. */
	readonly length: number
	readonly #points: readonly TilePoint[]
	/** How far down the lane each point is. */
	readonly #at: readonly number[]

	constructor(path: readonly TilePoint[]) {
		if (path.length === 0) throw new Error("a lane needs a path")
		this.#points = path
		const at = [0]
		for (let i = 1; i < path.length; i++) {
			at.push(at[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]))
		}
		this.#at = at
		this.length = at[at.length - 1]
	}

	/** How far down the lane the point of the path nearest a tile's centre is. */
	along(col: number, row: number): number {
		return this.#nearest(col, row).along
	}

	/** How far (tiles) a tile's centre is from the path. */
	offset(col: number, row: number): number {
		return this.#nearest(col, row).offset
	}

	#nearest(col: number, row: number): { along: number; offset: number } {
		const x = col + 0.5
		const y = row + 0.5
		const points = this.#points
		let best = 0
		let bestDistance = Math.hypot(x - points[0][0], y - points[0][1])
		for (let i = 1; i < points.length; i++) {
			const [ax, ay] = points[i - 1]
			const dx = points[i][0] - ax
			const dy = points[i][1] - ay
			const length2 = dx * dx + dy * dy
			const t =
				length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length2))
			const distance = Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
			if (distance < bestDistance) {
				bestDistance = distance
				best = this.#at[i - 1] + t * Math.sqrt(length2)
			}
		}
		return { along: best, offset: bestDistance }
	}

	/** The tile on the path `distance` down the lane, clamped to its ends. */
	tileAt(distance: number): [col: number, row: number] {
		const points = this.#points
		const at = this.#at
		const s = Math.max(0, Math.min(this.length, distance))
		let i = 1
		while (i < points.length - 1 && at[i] < s) i++
		if (points.length === 1) return [Math.floor(points[0][0]), Math.floor(points[0][1])]
		const span = at[i] - at[i - 1]
		const t = span === 0 ? 0 : (s - at[i - 1]) / span
		const [ax, ay] = points[i - 1]
		const [bx, by] = points[i]
		return [Math.floor(ax + (bx - ax) * t), Math.floor(ay + (by - ay) * t)]
	}
}
