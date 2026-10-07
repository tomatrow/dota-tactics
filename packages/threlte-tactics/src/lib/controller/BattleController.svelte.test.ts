import { describe, expect, expectTypeOf, test } from "vitest"
import { Resources } from "#lib/common/unity/Resources.ts"
import type { LevelData } from "#lib/model/LevelData.ts"
import { Point } from "#lib/model/Point.ts"
import { BattleController } from "./BattleController.svelte.ts"

/** A plus-shaped board around (1, 1), at height 2 (y 0.5). */
const plus: LevelData = {
	tiles: [
		[1, 2, 1],
		[0, 2, 1],
		[2, 2, 1],
		[1, 2, 0],
		[1, 2, 2]
	]
}

/** A battle past its intro conversation. */
async function started(levelData: LevelData) {
	const battle = new BattleController(levelData)
	battle.start()
	await expect.poll(() => battle.machine.current).toBe("CutSceneState")
	battle.machine.done()
	expect(battle.machine.current).toBe("SelectUnitState")
	return battle
}

describe("BattleController", () => {
	test("has a typed state machine", () => {
		const battle = new BattleController(plus)
		expectTypeOf(battle.machine.current).toEqualTypeOf<
			| "None"
			| "CutSceneState"
			| "InitBattleState"
			| "MoveSequenceState"
			| "MoveTargetState"
			| "SelectUnitState"
		>()
		expectTypeOf(battle.machine.move).parameters.toEqualTypeOf<[Point]>()
		// @ts-expect-error Not an action.
		expect(() => battle.machine.jump()).not.toThrow()
	})

	test("starts with no state, like Unity's StateMachine", () => {
		expect(new BattleController(plus).machine.current).toBe("None")
	})
})

describe("InitBattleState", () => {
	test("loads the level, selects its first tile, then hands over a frame later", async () => {
		const levelData = Resources.load<LevelData>("Levels/Level_0")!
		const battle = new BattleController(levelData)
		battle.start()

		expect(battle.machine.current).toBe("InitBattleState")
		expect(battle.board.tiles.size).toBe(140)
		expect(battle.pos).toBe(Point.of(1, 5))
		expect(battle.tileSelectionIndicator.localPosition).toEqual([1, 0.75, 5])

		await expect.poll(() => battle.machine.current).toBe("CutSceneState")
	})

	test("spawns a walking, a flying and a teleporting hero on the first three tiles", () => {
		const battle = new BattleController(plus)
		battle.start()

		expect(battle.units.map((u) => [u.tile?.pos, u.movement?.constructor.name])).toEqual([
			[Point.of(1, 1), "WalkMovement"],
			[Point.of(0, 1), "FlyMovement"],
			[Point.of(2, 1), "TeleportMovement"]
		])
		expect(battle.units[1]!.transform.localPosition).toEqual([0, 0.5, 1])
	})

	test("ignores input while it initializes", () => {
		const battle = new BattleController(plus)
		battle.start()
		battle.move(Point.of(0, 1))
		expect(battle.pos).toBe(Point.of(1, 1))
	})
})

describe("SelectUnitState", () => {
	test("moves the selection over the board only", async () => {
		const battle = await started(plus)
		battle.move(Point.of(0, 1))
		expect(battle.pos).toBe(Point.of(1, 2))
		expect(battle.tileSelectionIndicator.localPosition).toEqual([1, 0.5, 2])
		battle.move(Point.of(1, 0))
		expect(battle.pos).toBe(Point.of(1, 2))
	})

	test("confirming an empty tile does nothing; a unit's tile picks it", async () => {
		const battle = await started(plus)
		battle.move(Point.of(0, 1))
		battle.fire(0)
		expect(battle.machine.current).toBe("SelectUnitState")

		battle.move(Point.of(0, -1))
		battle.fire(0)
		expect(battle.machine.current).toBe("MoveTargetState")
		expect(battle.currentUnit).toBe(battle.units[0])
	})
})

describe("MoveTargetState and MoveSequenceState", () => {
	test("highlights the reachable tiles, moves the unit there, then picks again", async () => {
		const battle = await started(plus)
		const walker = battle.units[0]!
		battle.fire(0)

		const highlighted = () =>
			[...battle.board.tiles.values()].filter((t) => t.color !== "#ffffff").map((t) => `${t.pos}`)
		// The other heroes block the walker's way east and west.
		expect(highlighted()).toEqual(["(1,0)", "(1,2)"])

		// Can't move onto a tile out of range.
		battle.move(Point.of(1, 0))
		battle.fire(0)
		expect(battle.machine.current).toBe("MoveTargetState")

		battle.move(Point.of(-1, 1))
		battle.fire(0)
		expect(battle.machine.current).toBe("MoveSequenceState")
		expect(highlighted()).toEqual([])
		// No input while moving.
		battle.move(Point.of(0, -1))
		expect(battle.pos).toBe(Point.of(1, 2))

		await expect.poll(() => battle.machine.current).toBe("SelectUnitState")
		expect(walker.tile?.pos).toBe(Point.of(1, 2))
		expect(walker.transform.localPosition).toEqual([1, 0.5, 2])
	})
})
