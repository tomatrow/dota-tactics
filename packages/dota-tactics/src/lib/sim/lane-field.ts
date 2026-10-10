import { DIRECTIONS, inside, tileIndex, type Terrain } from "./grid.ts"
import { MinHeap } from "./heap.ts"

/** A point in tile coordinates (fractional): col east, row north. */
export type TilePoint = readonly [col: number, row: number]

/** The field's value where the end of the lane can't be reached. */
export const UNREACHABLE = 0x7fffffff

/** The cost of stepping onto a tile on the lane's centre line. */
const BASE_COST = 10
/** Extra cost per tile of distance from the centre line, inside the corridor. */
const OFF_CENTRE_COST = 2
/** The cost of stepping onto a tile outside the corridor. */
const OUTSIDE_COST = 40

/**
 * A lane's flow field: for every walkable tile, the cost of walking from it to the end of the
 * lane's path. Tiles cost more the further they are from the path, and much more outside a corridor
 * around it, so walking downhill on the field follows the road, and a unit that strayed (chasing
 * a target) heads back to it. Tiles marked in `blocked` (structures' footprints) are walked
 * around.
 */
export class LaneField {
	readonly terrain: Terrain
	/** Cost to the end of the lane per tile, row-major; UNREACHABLE where there's no way. */
	readonly cost: Int32Array

	constructor(
		terrain: Terrain,
		path: readonly TilePoint[],
		corridor: number,
		blocked?: Uint8Array
	) {
		if (path.length === 0) throw new Error("a lane needs a path")
		this.terrain = terrain
		const { cols, rows, walkable } = terrain
		const count = cols * rows

		// What stepping onto each tile costs, from its centre's distance to the path.
		const enter = new Int32Array(count)
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				const d = distanceToPath(col + 0.5, row + 0.5, path)
				enter[row * cols + col] =
					d <= corridor ? BASE_COST + Math.round(OFF_CENTRE_COST * d) : OUTSIDE_COST
			}
		}

		this.cost = new Int32Array(count).fill(UNREACHABLE)
		const [endCol, endRow] = path[path.length - 1]
		const goalCol = Math.floor(endCol)
		const goalRow = Math.floor(endRow)
		if (!inside(terrain, goalCol, goalRow)) throw new Error("the lane ends off the map")
		const goal = tileIndex(terrain, goalCol, goalRow)
		this.cost[goal] = 0
		const open = new MinHeap()
		open.push(goal, 0)
		for (let next = open.pop(); next; next = open.pop()) {
			const { item, priority } = next
			if (priority > this.cost[item]) continue
			const col = item % cols
			const row = (item - col) / cols
			// Stepping from a neighbour onto this tile costs this tile's price.
			const via = priority + enter[item]
			for (const { dc, dr } of DIRECTIONS) {
				const c = col + dc
				const r = row + dr
				if (!inside(terrain, c, r)) continue
				const n = r * cols + c
				if (walkable[n] !== 1 || blocked?.[n] === 1 || via >= this.cost[n]) continue
				this.cost[n] = via
				open.push(n, via)
			}
		}
	}

	at(col: number, row: number): number {
		return inside(this.terrain, col, row) ?
				this.cost[tileIndex(this.terrain, col, row)]
			:	UNREACHABLE
	}
}

/** The distance from a point to the nearest point of a polyline. */
export function distanceToPath(x: number, y: number, path: readonly TilePoint[]): number {
	if (path.length === 1) return Math.hypot(x - path[0][0], y - path[0][1])
	let best = Infinity
	for (let i = 1; i < path.length; i++) {
		const [ax, ay] = path[i - 1]
		const [bx, by] = path[i]
		const dx = bx - ax
		const dy = by - ay
		const length2 = dx * dx + dy * dy
		const t =
			length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length2))
		best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)))
	}
	return best
}
