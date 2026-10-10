import { DIRECTIONS, type Facing } from "./grid.ts"

/** A first step: the neighbouring tile to enter, and the facing that enters it. */
export interface FirstStep {
	readonly col: number
	readonly row: number
	readonly facing: Facing
}

/**
 * Breadth-first search in a square window around a start tile, for the first step of a shortest
 * 4-way path to the nearest goal tile. One per world: it reuses its buffers between searches.
 */
export class LocalSearch {
	/** How far (tiles, each axis) from the start the search looks. */
	readonly limit: number
	readonly #size: number
	/** Per window tile: the search it was last reached in. */
	readonly #seen: Int32Array
	/** Per window tile: the direction index of the first step on the way to it. */
	readonly #first: Int8Array
	readonly #queue: Int32Array
	#generation = 0

	constructor(limit: number) {
		this.limit = limit
		this.#size = 2 * limit + 1
		const area = this.#size * this.#size
		this.#seen = new Int32Array(area)
		this.#first = new Int8Array(area)
		this.#queue = new Int32Array(area)
	}

	/**
	 * The first step from (col, row) towards the nearest tile where `goal` holds, entering only
	 * tiles where `passable` holds; null when no goal is within the window. The start itself is
	 * never a goal. Ties go to the direction order: north, east, south, west.
	 */
	firstStep(
		col: number,
		row: number,
		passable: (col: number, row: number) => boolean,
		goal: (col: number, row: number) => boolean
	): FirstStep | null {
		const { limit } = this
		const size = this.#size
		const seen = this.#seen
		const first = this.#first
		const queue = this.#queue
		const generation = ++this.#generation
		const centre = limit * size + limit
		seen[centre] = generation
		let head = 0
		let tail = 0
		queue[tail++] = centre
		while (head < tail) {
			const at = queue[head++]
			const x = at % size
			const y = (at - x) / size
			for (let d = 0; d < DIRECTIONS.length; d++) {
				const { dc, dr } = DIRECTIONS[d]
				const nx = x + dc
				const ny = y + dr
				if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
				const n = ny * size + nx
				if (seen[n] === generation) continue
				const c = col + nx - limit
				const r = row + ny - limit
				if (!passable(c, r)) continue
				seen[n] = generation
				first[n] = at === centre ? d : first[at]
				if (goal(c, r)) {
					const step = DIRECTIONS[first[n]]
					return { col: col + step.dc, row: row + step.dr, facing: step.facing }
				}
				queue[tail++] = n
			}
		}
		return null
	}
}
