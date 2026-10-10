import { describe, expect, it } from "vitest"
import { terrain } from "#lib/testing/terrain.ts"
import { isWalkable, type Terrain } from "./grid.ts"
import { PathSearch, stepsLeft, type PathGoal } from "./path-search.ts"

/** Follows first steps from a tile until the search stops; the tiles walked, start excluded. */
function walk(
	board: Terrain,
	from: [number, number],
	goal: PathGoal,
	blocked: (col: number, row: number) => boolean = () => false,
	limit = 10_000
): [number, number][] {
	const search = new PathSearch(board.cols, board.rows)
	const pass = (c: number, r: number) => isWalkable(board, c, r) && !blocked(c, r)
	const tiles: [number, number][] = []
	let [col, row] = from
	for (let i = 0; i < 200; i++) {
		if (stepsLeft(goal, col, row) === 0) break
		const step = search.firstStep(col, row, goal, pass, pass, limit)
		if (!step) break
		col = step.col
		row = step.row
		tiles.push([col, row])
	}
	return tiles
}

const to = (col: number, row: number, slack = 0): PathGoal => ({ col, row, radius: 0, slack })

describe("PathSearch", () => {
	it("walks a shortest path round a wall", () => {
		// Row 0 is the bottom line. The wall leaves a gap at the top.
		const board = terrain([
			".......", //
			"...#...",
			"...#...",
			"...#...",
			"...#..."
		])
		const path = walk(board, [0, 0], to(6, 0))
		expect(path.at(-1)).toEqual([6, 0])
		// Up 4 to the gap, across 6, down 4.
		expect(path).toHaveLength(14)
		expect(path.some(([c, r]) => c === 3 && r < 4)).toBe(false)
	})

	it("stops within slack of a footprint", () => {
		const board = terrain([".".repeat(20)])
		const path = walk(board, [0, 0], { col: 15, row: 0, radius: 1, slack: 2 })
		// The footprint spans cols 14–16; reach 2 ends at col 12.
		expect(path.at(-1)).toEqual([12, 0])
	})

	it("keeps near the straight line on open ground", () => {
		const board = terrain(Array.from({ length: 13 }, () => ".".repeat(13)))
		const path = walk(board, [0, 0], to(12, 12))
		expect(path).toHaveLength(24)
		for (const [c, r] of path) expect(Math.abs(c - r)).toBeLessThanOrEqual(1)
	})

	it("goes as near as it can when the goal is cut off", () => {
		const board = terrain([
			"..#..", //
			"..#..",
			"..#.."
		])
		const path = walk(board, [0, 1], to(4, 1))
		expect(path.at(-1)).toEqual([1, 1])
	})

	it("passes tiles it can't stop on", () => {
		const board = terrain([".".repeat(9)])
		const search = new PathSearch(board.cols, board.rows)
		const pass = (c: number, r: number) => isWalkable(board, c, r)
		// Tiles 2–5 may be walked through, not stopped on.
		const stand = (c: number) => c < 2 || c > 5
		const step = search.firstStep(0, 0, to(4, 0, 1), pass, (c) => stand(c), 1000)
		expect(step).toEqual({ col: 1, row: 0, facing: 1 })
		// From inside them, the only tile within 2 of col 4 it may stop on is col 6.
		const out = search.firstStep(4, 0, to(4, 0, 2), pass, (c) => stand(c), 1000)
		expect(out?.col).toBe(5)
	})
})
