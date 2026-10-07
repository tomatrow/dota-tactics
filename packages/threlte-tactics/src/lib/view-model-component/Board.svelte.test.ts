import { describe, expect, test } from "vitest"
import { Resources } from "#lib/common/unity/Resources.ts"
import type { LevelData } from "#lib/model/LevelData.ts"
import { Point } from "#lib/model/Point.ts"
import { Board } from "./Board.svelte.ts"
import { Tile } from "./Tile.svelte.ts"

describe("Tile", () => {
	test("loads from a LevelData vector and matches its transform to its height", () => {
		const tile = new Tile()
		tile.load([2, 3, 5])

		expect(tile.pos).toBe(Point.of(2, 5))
		expect(tile.height).toBe(3)
		expect(tile.center).toEqual([2, 0.75, 5])
		expect(tile.localPosition).toEqual([2, 0.375, 5])
		expect(tile.localScale).toEqual([1, 0.75, 1])
	})

	test("grows and shrinks a step at a time", () => {
		const tile = new Tile()
		tile.load(Point.of(0, 0), 1)
		tile.grow()
		tile.grow()
		tile.shrink()
		expect(tile.height).toBe(2)
	})
})

describe("Board", () => {
	const level = Resources.load<LevelData>("Levels/Level_0")

	test("loads every tile of a level", () => {
		expect(level?.tiles).toHaveLength(140)
		const board = new Board()
		board.load(level!)

		expect(board.tiles.size).toBe(140)
		// The first tile of Level_0 is [1, 3, 5].
		expect(board.getTile(Point.of(1, 5))?.height).toBe(3)
		expect(board.getTile(Point.of(-1, -1))).toBeNull()
	})

	test("tracks the extents of the board", () => {
		const board = new Board()
		board.load({
			tiles: [
				[2, 1, 7],
				[-3, 1, 4],
				[5, 2, -1]
			]
		})
		expect(board.min).toBe(Point.of(-3, -1))
		expect(board.max).toBe(Point.of(5, 7))
	})
})
