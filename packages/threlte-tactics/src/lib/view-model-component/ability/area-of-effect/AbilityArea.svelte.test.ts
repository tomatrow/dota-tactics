import { describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { Point } from "#lib/model/Point.ts"
import { board, positions } from "#lib/testing/board.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { ConeAbilityRange } from "../range/ConeAbilityRange.ts"
import { FullAbilityArea } from "./FullAbilityArea.ts"
import { SpecifyAbilityArea } from "./SpecifyAbilityArea.ts"
import { UnitAbilityArea } from "./UnitAbilityArea.ts"

describe("UnitAbilityArea", () => {
	test("is the aimed tile, if there is one", () => {
		const b = board("1.1")
		const area = new UnitAbilityArea()
		expect(positions(area.getTilesInArea(b, Point.of(2, 0)))).toEqual(["(2,0)"])
		expect(area.getTilesInArea(b, Point.of(1, 0))).toEqual([])
	})
})

describe("SpecifyAbilityArea", () => {
	test("spreads `horizontal` steps from the aimed tile, within `vertical` of its height", () => {
		const b = board("11111", "12321", "11111")
		const area = new SpecifyAbilityArea({ horizontal: 1, vertical: 1 })
		expect(positions(area.getTilesInArea(b, Point.of(2, 1)))).toEqual(["(1,1)", "(2,1)", "(3,1)"])
		expect(positions(area.getTilesInArea(b, Point.of(0, 0)))).toEqual(["(0,0)", "(0,1)", "(1,0)"])

		area.horizontal = 2
		area.vertical = 0
		// Round the hill, not over it.
		expect(positions(area.getTilesInArea(b, Point.of(0, 1)))).toEqual([
			"(0,0)",
			"(0,1)",
			"(0,2)",
			"(1,0)",
			"(1,2)"
		])
	})

	test("defaults to just the aimed tile", () => {
		const b = board("111")
		expect(positions(new SpecifyAbilityArea().getTilesInArea(b, Point.of(1, 0)))).toEqual(["(1,0)"])
	})
})

describe("FullAbilityArea", () => {
	test("is the whole range, wherever it is aimed", () => {
		const b = board("111", "111", "111")
		const unit = new Unit({ name: "Hero", model: "Hero", notifications: new NotificationCenter() })
		unit.place(b.getTile(Point.of(1, 0)))
		unit.dir = Directions.North
		const range = new ConeAbilityRange(unit, { horizontal: 2 })
		const area = new FullAbilityArea(range)
		expect(area.getTilesInArea(b, Point.of(0, 0))).toEqual(range.getTilesInRange(b))
		expect(positions(area.getTilesInArea(b, Point.of(0, 0)))).toEqual([
			"(0,2)",
			"(1,1)",
			"(1,2)",
			"(2,2)"
		])
	})
})
