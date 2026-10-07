import { describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { Point } from "#lib/model/Point.ts"
import { board, positions } from "#lib/testing/board.ts"
import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { ConeAbilityRange } from "./ConeAbilityRange.ts"
import { ConstantAbilityRange } from "./ConstantAbilityRange.ts"
import { InfiniteAbilityRange } from "./InfiniteAbilityRange.ts"
import { LineAbilityRange } from "./LineAbilityRange.ts"
import { SelfAbilityRange } from "./SelfAbilityRange.ts"

function unitAt(b: Board, x: number, y: number, dir: Directions = Directions.North): Unit {
	const unit = new Unit({ name: "Hero", model: "Hero", notifications: new NotificationCenter() })
	unit.place(b.getTile(Point.of(x, y)))
	unit.dir = dir
	return unit
}

const flat = ["11111", "11111", "11111", "11111", "11111"]

describe("ConstantAbilityRange", () => {
	test("reaches every tile within `horizontal` steps, the user's own included", () => {
		const b = board(...flat)
		const range = new ConstantAbilityRange(unitAt(b, 2, 2))
		expect(range).toMatchObject({ horizontal: 1, vertical: 2_147_483_647 })
		expect(positions(range.getTilesInRange(b))).toEqual([
			"(1,2)",
			"(2,1)",
			"(2,2)",
			"(2,3)",
			"(3,2)"
		])

		range.horizontal = 2
		expect(range.getTilesInRange(b)).toHaveLength(13)
	})

	test("stops at tiles too high above or below the user, and doesn't reach past them", () => {
		const b = board("12311", "11911")
		const range = new ConstantAbilityRange(unitAt(b, 0, 0), { horizontal: 4, vertical: 1 })
		// (2,0) is 2 steps above the user; (2,1) is 8. Holes in the search stop it too.
		expect(positions(range.getTilesInRange(b))).toEqual(["(0,0)", "(0,1)", "(1,0)", "(1,1)"])
	})

	test("aims by position", () => {
		const b = board(...flat)
		const range = new ConstantAbilityRange(unitAt(b, 0, 0))
		expect([range.positionOriented, range.directionOriented]).toEqual([true, false])
	})
})

describe("SelfAbilityRange and InfiniteAbilityRange", () => {
	test("reach only the user's tile, or the whole board; neither aims", () => {
		const b = board("111", "1.1")
		const unit = unitAt(b, 1, 0)
		const self = new SelfAbilityRange(unit)
		const infinite = new InfiniteAbilityRange(unit)

		expect(self.getTilesInRange(b)).toEqual([unit.tile])
		expect(infinite.getTilesInRange(b)).toEqual([...b.tiles.values()])
		expect(infinite.getTilesInRange(b)).toHaveLength(5)
		for (const range of [self, infinite])
			expect([range.positionOriented, range.directionOriented]).toEqual([false, false])
	})
})

describe("ConeAbilityRange", () => {
	test.each([
		[Directions.North, 2, 0, ["(2,1)", "(1,2)", "(2,2)", "(3,2)"]],
		[Directions.South, 2, 4, ["(2,3)", "(1,2)", "(2,2)", "(3,2)"]],
		[Directions.East, 0, 2, ["(1,2)", "(2,1)", "(2,2)", "(2,3)"]],
		[Directions.West, 4, 2, ["(3,2)", "(2,1)", "(2,2)", "(2,3)"]]
	])("spreads out in front of the user, facing %i", (dir, x, y, expected) => {
		const b = board(...flat)
		const range = new ConeAbilityRange(unitAt(b, x, y, dir), { horizontal: 2 })
		expect(range.getTilesInRange(b).map((t) => `${t.pos}`)).toEqual(expected)
	})

	test("skips holes and tiles out of vertical reach, and aims by direction", () => {
		const b = board("11111", "11.11", "13111")
		const range = new ConeAbilityRange(unitAt(b, 2, 0), { horizontal: 2, vertical: 1 })
		expect(range.getTilesInRange(b).map((t) => `${t.pos}`)).toEqual(["(2,2)", "(3,2)"])
		expect([range.positionOriented, range.directionOriented]).toEqual([true, true])
	})
})

describe("LineAbilityRange", () => {
	test("runs `horizontal` tiles in front of the user", () => {
		const b = board(...flat)
		const range = new LineAbilityRange(unitAt(b, 0, 2, Directions.East), { horizontal: 3 })
		expect(range.getTilesInRange(b).map((t) => `${t.pos}`)).toEqual(["(1,2)", "(2,2)", "(3,2)"])
		expect([range.positionOriented, range.directionOriented]).toEqual([true, true])
	})

	test("stops at the board's edge, skipping holes and tiles out of vertical reach", () => {
		const b = board("1", "1", ".", "3", "2", "1")
		const unit = unitAt(b, 0, 0, Directions.North)
		const range = new LineAbilityRange(unit, { horizontal: 99, vertical: 1 })
		expect(range.getTilesInRange(b).map((t) => `${t.pos}`)).toEqual(["(0,1)", "(0,4)", "(0,5)"])

		unit.dir = Directions.South
		expect(range.getTilesInRange(b)).toEqual([])
	})

	test("counts holes towards its length", () => {
		const b = board("1.111")
		const range = new LineAbilityRange(unitAt(b, 0, 0, Directions.East), { horizontal: 2 })
		expect(range.getTilesInRange(b).map((t) => `${t.pos}`)).toEqual(["(2,0)"])
	})
})
