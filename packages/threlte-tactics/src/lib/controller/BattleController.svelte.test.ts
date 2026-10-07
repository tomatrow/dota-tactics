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

async function started(levelData: LevelData) {
	const battle = new BattleController(levelData)
	battle.start()
	await expect.poll(() => battle.machine.current).toBe("MoveTargetState")
	return battle
}

describe("BattleController", () => {
	test("has a typed state machine", () => {
		const battle = new BattleController(plus)
		expectTypeOf(battle.machine.current).toEqualTypeOf<
			"None" | "InitBattleState" | "MoveTargetState"
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

		await expect.poll(() => battle.machine.current).toBe("MoveTargetState")
	})

	test("ignores input while it initializes", () => {
		const battle = new BattleController(plus)
		battle.start()
		battle.move(Point.of(1, 0))
		expect(battle.pos).toBe(Point.of(1, 1))
	})
})

describe("MoveTargetState", () => {
	test("moves the selection by the input direction", async () => {
		const battle = await started(plus)
		battle.move(Point.of(1, 0))
		expect(battle.pos).toBe(Point.of(2, 1))
		expect(battle.tileSelectionIndicator.localPosition).toEqual([2, 0.5, 1])
		battle.move(Point.of(-1, 0))
		battle.move(Point.of(0, 1))
		expect(battle.pos).toBe(Point.of(1, 2))
	})

	test("keeps the selection on the board", async () => {
		const battle = await started(plus)
		battle.move(Point.of(1, 1))
		battle.move(Point.of(0, 5))
		expect(battle.pos).toBe(Point.of(1, 1))
	})
})
