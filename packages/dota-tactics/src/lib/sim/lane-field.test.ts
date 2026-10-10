import { describe, expect, it } from "vitest"
import { terrain } from "#lib/testing/terrain.ts"
import { DIRECTIONS } from "./grid.ts"
import { distanceToPath, LaneField, UNREACHABLE } from "./lane-field.ts"

// An L: along the bottom, then up the right side, in a field open on all sides.
const board = terrain([
	"..........",
	"..........",
	"..........",
	"..........",
	"....#.....",
	"....#.....",
	".........."
])
const path = [
	[0.5, 0.5],
	[8.5, 0.5],
	[8.5, 6.5]
] as const

describe("distanceToPath", () => {
	it("measures to the nearest segment", () => {
		expect(distanceToPath(4.5, 3.5, path)).toBeCloseTo(3)
		expect(distanceToPath(6.5, 4.5, path)).toBeCloseTo(2)
	})
})

describe("LaneField", () => {
	const field = new LaneField(board, path, 2)

	it("is zero at the end of the path", () => {
		expect(field.at(8, 6)).toBe(0)
	})

	it("can't be reached through walls or off the map", () => {
		expect(field.at(4, 2)).toBe(UNREACHABLE)
		expect(field.at(-1, 0)).toBe(UNREACHABLE)
	})

	it("is cheaper on the path than beside it", () => {
		// Both are 4 steps from the end; only one is on the path.
		expect(field.at(8, 2)).toBeLessThan(field.at(6, 4))
	})

	it("leads from the start along the path to the end", () => {
		let [col, row] = [0, 0]
		const visited: string[] = []
		while (field.at(col, row) > 0) {
			const here = field.at(col, row)
			const next = DIRECTIONS.map(({ dc, dr }) => [col + dc, row + dr] as const)
				.filter(([c, r]) => field.at(c, r) < here)
				.sort((a, b) => field.at(...a) - field.at(...b))[0]
			;[col, row] = next
			visited.push(`${String(col)},${String(row)}`)
		}
		expect(visited.at(-1)).toBe("8,6")
		// A shortest route that keeps to the path (it may cut the corner by a tile).
		expect(visited).toHaveLength(14)
		for (const tile of visited) {
			const [c, r] = tile.split(",").map(Number)
			expect(distanceToPath(c + 0.5, r + 0.5, path), tile).toBeLessThanOrEqual(1.5)
		}
	})

	it("walks round blocked tiles", () => {
		const blocked = new Uint8Array(board.cols * board.rows)
		blocked[0 * board.cols + 5] = 1
		const around = new LaneField(board, path, 2, blocked)
		expect(around.at(5, 0)).toBe(UNREACHABLE)
		expect(around.at(4, 0)).toBeLessThan(UNREACHABLE)
		expect(around.at(4, 0)).toBeGreaterThan(field.at(4, 0))
	})
})
