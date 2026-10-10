import { describe, expect, it } from "vitest"
import { MapModel } from "#lib/map/model.ts"
import { fixtureMap } from "#lib/testing/fixture.ts"
import { buildColumns, PART_CLIFF, PART_STEP, PART_TOP } from "./columns.ts"
import { pickColumn } from "./picking.ts"
import { placeTrees, treeGround } from "./trees.ts"

describe("buildColumns", () => {
	// Two tiles side by side: west at 0, east at 128; the floor 64 below the lowest.
	const model = new MapModel(
		fixtureMap({ cols: 2, rows: 1, origin: [0, 0], height: (c) => c * 128 })
	)
	const mesh = buildColumns(
		model,
		(i) => model.height[i],
		(i) => model.height[i],
		-64
	)
	const quads = mesh.tile.length / 4

	it("draws a top per tile and only the walls you can see", () => {
		// West: top + walls to the floor on W, N, S (its east neighbour is higher).
		// East: top + W wall down to the west tile + walls to the floor on E, N, S.
		expect(quads).toBe(2 + 3 + 4)
		const parts = Array.from({ length: quads }, (_, q) => mesh.part[q * 4])
		expect(parts.filter((p) => p === PART_TOP)).toHaveLength(2)
		expect(parts.filter((p) => p === PART_STEP)).toHaveLength(3) // west tile: 64-unit drops
		expect(parts.filter((p) => p === PART_CLIFF)).toHaveLength(4) // east tile: 128 and 192 drops
	})

	it("winds every triangle to face along its normal", () => {
		const p = mesh.positions
		for (let t = 0; t < mesh.indices.length; t += 3) {
			const [a, b, c] = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2]].map(
				(v) => v * 3
			)
			const u = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]]
			const v = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]]
			const cross = [
				u[1] * v[2] - u[2] * v[1],
				u[2] * v[0] - u[0] * v[2],
				u[0] * v[1] - u[1] * v[0]
			]
			const n = [mesh.normals[a], mesh.normals[a + 1], mesh.normals[a + 2]]
			expect(cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2]).toBeGreaterThan(0)
		}
	})

	it("places tops in scene space at height / cell", () => {
		const tops = Array.from({ length: quads }, (_, q) => q).filter(
			(q) => mesh.part[q * 4] === PART_TOP
		)
		const ys = tops.map((q) => mesh.positions[q * 12 + 1])
		expect(ys).toEqual([0, 2])
		// West tile spans X ∈ [-1, 0] on a 2-wide board.
		expect(mesh.positions[tops[0] * 12]).toBe(-1)
	})
})

describe("pickColumn", () => {
	// 3×3 board, all at height 1 except a tall centre column (4) and a missing corner.
	const tops = [
		[1, 1, Number.NaN],
		[1, 4, 1],
		[1, 1, 1]
	]
	const top = (col: number, row: number) => tops[row][col]
	const pick = (origin: [number, number, number], direction: [number, number, number]) => {
		const [x, y, z] = origin
		const [dx, dy, dz] = direction
		const length = Math.hypot(dx, dy, dz)
		return pickColumn(
			{ x, y, z },
			{ x: dx / length, y: dy / length, z: dz / length },
			3,
			3,
			top,
			-1,
			4
		)
	}

	it("hits the top of the column straight below", () => {
		// Tile (0, 0) is X ∈ [-1.5, -0.5], Z ∈ [0.5, 1.5] (row 0 is south, +Z).
		expect(pick([-1, 10, 1], [0, -1, 0])).toMatchObject({ col: 0, row: 0, face: "top", t: 9 })
	})

	it("hits the side of a tall column before the tile behind it", () => {
		// Flying west at height 2 along the middle row: it crosses the east tile (top 1) from
		// X = 1.5 to 0.5, then the centre column's east face stops it at X = 0.5.
		expect(pick([5, 2, 0], [-1, 0, 0])).toMatchObject({ col: 1, row: 1, face: "side", t: 4.5 })
	})

	it("passes through missing tiles and misses outside the board", () => {
		// Straight down through the missing south-east corner (col 2, row 0: Z ∈ [0.5, 1.5]).
		expect(pick([1, 10, 1], [0, -1, 0])).toBeNull()
		expect(pick([10, 10, 10], [0, -1, 0])).toBeNull()
	})

	it("lands on a top when a diagonal ray enters through the ceiling", () => {
		// Aimed at the centre column's top centre (0, 4, 0) from three units up and back.
		const hit = pick([-3, 7, 3], [1, -1, -1])
		expect(hit).toMatchObject({ col: 1, row: 1, face: "top" })
		expect(hit?.t).toBeCloseTo(3 * Math.sqrt(3))
	})

	it("hits the side of a tall column on a diagonal", () => {
		expect(pick([-3, 5, 3], [1, -1, -1])).toMatchObject({ col: 1, row: 1, face: "side" })
	})
})

describe("treeGround", () => {
	it("stands a tree on the median height of the four tiles around its corner", () => {
		const model = new MapModel(
			fixtureMap({
				cols: 2,
				rows: 2,
				origin: [0, 0],
				height: (c, r) => [0, 100, 40, 300][r * 2 + c]
			})
		)
		expect(treeGround(model, 64, 64)).toBe(70)
		expect(treeGround(model, 0, 0)).toBe(0) // corner of the board: only one tile
		expect(treeGround(model, 640, 640)).toBeNaN()
	})
})

describe("placeTrees", () => {
	const model = new MapModel(
		fixtureMap({
			cols: 2,
			rows: 2,
			origin: [0, 0],
			trees: [
				[64, 64, 0],
				[640, 640, 0]
			]
		})
	)

	it("places trees that stand on ground, the same way every time", () => {
		const trees = placeTrees(model)
		expect(trees).toHaveLength(1) // the second is off the board
		expect(trees[0]).toMatchObject({ x: 0, z: 0, ground: 128 })
		expect(placeTrees(model)).toEqual(trees)
	})
})
