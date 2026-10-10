import { DIRECTIONS, footprintDistance } from "./grid.ts"
import { MinHeap } from "./heap.ts"
import type { FirstStep } from "./search.ts"

/** Where a path may end: a tile within `slack` steps (Manhattan) of a target's footprint. */
export interface PathGoal {
	readonly col: number
	readonly row: number
	/** The target's footprint: tiles out from its centre (0 = one tile). */
	readonly radius: number
	readonly slack: number
}

/** Steps left from a tile to the nearest tile a path to `goal` may end on, ignoring obstacles. */
export const stepsLeft = (goal: PathGoal, col: number, row: number): number =>
	Math.max(0, footprintDistance(col, row, 0, goal.col, goal.row, goal.radius) - goal.slack)

// Priority = steps so far + steps left, then steps left (deepest first), then distance from the
// straight line to the goal: among equally short paths, the one that stays nearest the line.
const BY_TOTAL = 2 ** 24
const BY_LEFT = 2 ** 12
const LINE_STEPS = 16

/**
 * A* over the whole board for a hero's next step (4-way, every step costing 1). One per world: it
 * reuses its buffers between searches.
 */
export class PathSearch {
	readonly cols: number
	readonly rows: number
	readonly #steps: Int32Array
	/** Per tile: the search that last set its steps. */
	readonly #seen: Int32Array
	/** Per tile: the search that last expanded it. */
	readonly #closed: Int32Array
	/** Per tile: the direction index of the first step on the way to it. */
	readonly #first: Int8Array
	readonly #open = new MinHeap()
	#generation = 0

	constructor(cols: number, rows: number) {
		this.cols = cols
		this.rows = rows
		const count = cols * rows
		this.#steps = new Int32Array(count)
		this.#seen = new Int32Array(count)
		this.#closed = new Int32Array(count)
		this.#first = new Int8Array(count)
	}

	/**
	 * The first step of a shortest path from (col, row) to a tile where `stand` holds within the
	 * goal, entering only tiles where `pass` holds. When no such tile is found within `limit`
	 * expansions, the first step towards the explored tile where `stand` holds nearest the goal
	 * instead; null when that's the start (or nothing qualifies).
	 */
	firstStep(
		col: number,
		row: number,
		goal: PathGoal,
		pass: (col: number, row: number) => boolean,
		stand: (col: number, row: number) => boolean,
		limit: number
	): FirstStep | null {
		const { cols, rows } = this
		const steps = this.#steps
		const seen = this.#seen
		const closed = this.#closed
		const first = this.#first
		const open = this.#open
		const generation = ++this.#generation
		open.clear()

		const lineCol = goal.col - col
		const lineRow = goal.row - row
		const lineLength = Math.hypot(lineCol, lineRow)
		const priority = (c: number, r: number, taken: number, left: number) => {
			const off =
				lineLength === 0 ? 0 : Math.abs((c - col) * lineRow - (r - row) * lineCol) / lineLength
			const line = Math.min(BY_LEFT - 1, Math.round(off * LINE_STEPS))
			return (taken + left) * BY_TOTAL + left * BY_LEFT + line
		}
		const stepTo = (tile: number): FirstStep => {
			const step = DIRECTIONS[first[tile]]
			return { col: col + step.dc, row: row + step.dr, facing: step.facing }
		}

		const start = row * cols + col
		steps[start] = 0
		seen[start] = generation
		open.push(start, priority(col, row, 0, stepsLeft(goal, col, row)))
		let best = stand(col, row) ? start : -1
		let bestLeft = best === start ? stepsLeft(goal, col, row) : Infinity
		let bestSteps = 0
		let expanded = 0

		for (let next = open.pop(); next; next = open.pop()) {
			const at = next.item
			if (closed[at] === generation) continue
			closed[at] = generation
			const c = at % cols
			const r = (at - c) / cols
			const taken = steps[at]
			const left = stepsLeft(goal, c, r)
			if (at !== start && stand(c, r)) {
				if (left === 0) return stepTo(at)
				if (left < bestLeft || (left === bestLeft && taken < bestSteps)) {
					best = at
					bestLeft = left
					bestSteps = taken
				}
			}
			if (++expanded > limit) break
			for (let d = 0; d < DIRECTIONS.length; d++) {
				const { dc, dr } = DIRECTIONS[d]
				const nc = c + dc
				const nr = r + dr
				if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
				const n = nr * cols + nc
				if (closed[n] === generation || !pass(nc, nr)) continue
				const via = taken + 1
				if (seen[n] === generation && steps[n] <= via) continue
				seen[n] = generation
				steps[n] = via
				first[n] = at === start ? d : first[at]
				open.push(n, priority(nc, nr, via, stepsLeft(goal, nc, nr)))
			}
		}
		return best >= 0 && best !== start ? stepTo(best) : null
	}
}
