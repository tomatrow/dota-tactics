import { describe, expect, test } from "vitest"
import { Resources } from "#lib/common/unity/Resources.ts"
import type { LevelData } from "#lib/model/LevelData.ts"
import { Point } from "#lib/model/Point.ts"
import { board } from "#lib/testing/board.ts"
import { Board } from "./Board.svelte.ts"
import { Tile } from "./Tile.svelte.ts"

describe("Tile", () => {
	test("loads from a LevelData vector and matches its transform to its height", () => {
		const tile = new Tile()
		tile.load([2, 3, 5])

		expect(tile.pos).toBe(Point.of(2, 5))
		expect(tile.height).toBe(3)
		expect(tile.center).toEqual([2, 0.75, -5])
		expect(tile.position).toEqual([2, 0.375, -5])
		expect(tile.scale).toEqual([1, 0.75, 1])
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
	test("loads every tile of a level", () => {
		const level = Resources.load<LevelData>("Levels/Level_0")!
		expect(level.tiles).toHaveLength(140)
		const b = new Board()
		b.load(level)

		expect(b.tiles.size).toBe(140)
		// The first tile of Level_0 is [1, 3, 5].
		expect(b.getTile(Point.of(1, 5))?.height).toBe(3)
		expect(b.getTile(Point.of(-1, -1))).toBeNull()
	})

	test("tracks the extents of the board", () => {
		const b = new Board()
		b.load({
			tiles: [
				[2, 1, 7],
				[-3, 1, 4],
				[5, 2, -1]
			]
		})
		expect(b.min).toBe(Point.of(-3, -1))
		expect(b.max).toBe(Point.of(5, 7))
	})

	test("rejects duplicate tiles", () => {
		expect(() =>
			new Board().load({
				tiles: [
					[0, 1, 0],
					[0, 2, 0]
				]
			})
		).toThrow()
	})

	describe("search", () => {
		test("returns the start, then tiles breadth first in Unity's direction order", () => {
			const b = board("111", "111", "111")
			const start = b.getTile(Point.of(1, 1))!
			const found = b.search(start, () => true)

			expect(found.map((t) => `${t.pos}`)).toEqual([
				"(1,1)",
				// N, S, E, W of the start
				"(1,2)",
				"(1,0)",
				"(2,1)",
				"(0,1)",
				// then from (1,2), (1,0), (2,1)
				"(2,2)",
				"(0,2)",
				"(2,0)",
				"(0,0)"
			])
		})

		test("records each tile's distance and the shortest path back", () => {
			// A hole at (1,0) makes the way from (0,0) to (2,0) go round through row 1.
			const b = board("1.1", "111")
			const start = b.getTile(Point.of(0, 0))!
			b.search(start, () => true)

			const end = b.getTile(Point.of(2, 0))!
			expect(end.distance).toBe(4)
			const path: string[] = []
			for (let t: Tile | null = end; t; t = t.prev) path.unshift(`${t.pos}`)
			expect(path).toEqual(["(0,0)", "(0,1)", "(1,1)", "(2,1)", "(2,0)"])
		})

		test("only expands where addTile allows", () => {
			const b = board("1111")
			const start = b.getTile(Point.of(0, 0))!
			const found = b.search(start, (from) => from.distance + 1 <= 2)
			expect(found.map((t) => t.pos.x)).toEqual([0, 1, 2])
			// Tiles left over from an earlier search are reset.
			expect(b.getTile(Point.of(3, 0))!.prev).toBeNull()
		})
	})

	test("highlights tiles and clears the highlight", () => {
		const b = board("11")
		const tiles = [...b.tiles.values()]
		b.selectTiles(tiles)
		expect(tiles.map((t) => t.color)).toEqual(["#00ffff", "#00ffff"])
		b.deSelectTiles(tiles.slice(1))
		expect(tiles.map((t) => t.color)).toEqual(["#00ffff", "#ffffff"])
	})
})
