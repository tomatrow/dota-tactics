import { beforeEach, describe, expect, expectTypeOf, test } from "vitest"
import { Resources } from "#lib/common/unity/Resources.ts"
import type { LevelData } from "#lib/model/LevelData.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Point } from "#lib/model/Point.ts"
import { Rank } from "#lib/view-model-component/actor/Rank.ts"
import { advance, useFakeTime } from "#lib/testing/time.ts"
import { BattleController } from "./BattleController.svelte.ts"

/**
 * A plus-shaped board around (1, 1), at height 2 (y 0.5). The test heroes start on the first three
 * tiles: a Rogue (1, 1), a Warrior (0, 1) and a Wizard (2, 1).
 */
const plus: LevelData = {
	tiles: [
		[1, 2, 1],
		[0, 2, 1],
		[2, 2, 1],
		[1, 2, 0],
		[1, 2, 2]
	]
}

beforeEach(useFakeTime)

/** A battle past its intro conversation, at the first unit's command menu. */
async function started(levelData = plus) {
	const battle = new BattleController(levelData, { seed: 1 })
	battle.start()
	await advance(0.1)
	expect(battle.machine.current).toBe("CutSceneState")
	battle.machine.done()
	await advance(0.1)
	expect(battle.machine.current).toBe("CommandSelectionState")
	return battle
}

const menu = (battle: BattleController) => {
	const { title, menuEntries, selection } = battle.abilityMenuPanelController
	return {
		title,
		entries: menuEntries.map((e) => (e.isLocked ? `(${e.title})` : e.title)),
		selected: menuEntries[selection]?.title
	}
}

describe("BattleController", () => {
	test("has a typed state machine", () => {
		const battle = new BattleController(plus)
		expectTypeOf(battle.machine.current).toEqualTypeOf<
			| "None"
			| "ActionSelectionState"
			| "CategorySelectionState"
			| "CommandSelectionState"
			| "CutSceneState"
			| "ExploreState"
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

		await advance(0.1)
		expect(battle.machine.current).toBe("CutSceneState")
	})

	test("spawns a level 10 walking Rogue, Warrior and Wizard on the first three tiles", () => {
		const battle = new BattleController(plus)
		battle.start()

		expect(
			battle.units.map((u) => [u.name, u.tile?.pos, u.job?.name, u.movement?.constructor.name])
		).toEqual([
			["Hero(Clone)", Point.of(1, 1), "Rogue", "WalkMovement"],
			["Hero(Clone)", Point.of(0, 1), "Warrior", "WalkMovement"],
			["Hero(Clone)", Point.of(2, 1), "Wizard", "WalkMovement"]
		])
		expect(battle.units[1]!.transform.localPosition).toEqual([0, 0.5, 1])

		const { LVL, EXP, HP, MHP, MOV, JMP } = StatTypes
		expect(battle.units.map((u) => [MOV, JMP, LVL, EXP].map((t) => u.stats.get(t)))).toEqual([
			[5, 3, 10, Rank.experienceForLevel(10)],
			[4, 1, 10, Rank.experienceForLevel(10)],
			[3, 2, 10, Rank.experienceForLevel(10)]
		])
		// Nine level ups: the Warrior's MHP grows 8 or 9 points each, and HP is refilled.
		const warrior = battle.units[1]!.stats
		expect(warrior.get(MHP)).toBeGreaterThanOrEqual(43 + 9 * 8)
		expect(warrior.get(MHP)).toBeLessThanOrEqual(43 + 9 * 9)
		expect(warrior.get(HP)).toBe(warrior.get(MHP))
	})

	test("a seed replays the stats' growth", () => {
		const stats = (seed: number) => {
			const battle = new BattleController(plus, { seed })
			battle.start()
			return battle.units.map((u) =>
				Object.values(StatTypes)
					.slice(0, -1)
					.map((t) => u.stats.get(t as StatTypes))
			)
		}
		expect(stats(5)).toEqual(stats(5))
		expect(stats(5)).not.toEqual(stats(6))
	})

	test("ignores input while it initializes", () => {
		const battle = new BattleController(plus)
		battle.start()
		battle.move(Point.of(0, 1))
		expect(battle.pos).toBe(Point.of(1, 1))
	})
})

describe("SelectUnitState", () => {
	test("gives the units turns in order, a frame later", async () => {
		const battle = await started()
		expect(battle.turn.actor).toBe(battle.units[0])

		battle.move(Point.of(0, -1))
		battle.move(Point.of(0, -1))
		expect(menu(battle).selected).toBe("Wait")
		battle.fire(0)
		expect(battle.machine.current).toBe("SelectUnitState")
		expect(battle.turn.actor).toBe(battle.units[1])
		await advance(0.1)
		expect(battle.machine.current).toBe("CommandSelectionState")
		// The menu state selects the actor's tile.
		expect(battle.pos).toBe(Point.of(0, 1))
	})
})

describe("CommandSelectionState", () => {
	test("shows the commands; right/down select the next entry, left/up the previous", async () => {
		const battle = await started()
		expect(menu(battle)).toEqual({
			title: "Commands",
			entries: ["Move", "Action", "Wait"],
			selected: "Move"
		})
		expect(battle.abilityMenuPanelController.canvasActive).toBe(true)

		battle.move(Point.of(1, 0))
		expect(menu(battle).selected).toBe("Action")
		battle.move(Point.of(0, -1))
		expect(menu(battle).selected).toBe("Wait")
		battle.move(Point.of(0, -1))
		expect(menu(battle).selected).toBe("Move")
		battle.move(Point.of(0, 1))
		expect(menu(battle).selected).toBe("Wait")
		battle.move(Point.of(-1, 0))
		expect(menu(battle).selected).toBe("Action")
	})

	test("cancelling before moving explores the board until confirmed", async () => {
		const battle = await started()
		battle.fire(1)
		expect(battle.machine.current).toBe("ExploreState")

		battle.move(Point.of(0, 1))
		expect(battle.pos).toBe(Point.of(1, 2))
		battle.fire(1)
		expect(battle.machine.current).toBe("ExploreState")
		battle.fire(0)
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(battle.pos).toBe(Point.of(1, 1))
	})
})

describe("MoveTargetState and MoveSequenceState", () => {
	const highlighted = (battle: BattleController) =>
		[...battle.board.tiles.values()].filter((t) => t.color !== "#ffffff").map((t) => `${t.pos}`)

	test("highlights the reachable tiles, moves the unit there, then locks Move", async () => {
		const battle = await started()
		const walker = battle.units[0]!
		battle.fire(0)
		expect(battle.machine.current).toBe("MoveTargetState")

		// The other heroes block the walker's way east and west.
		expect(highlighted(battle)).toEqual(["(1,0)", "(1,2)"])

		// Can't move onto a tile out of range.
		battle.move(Point.of(1, 0))
		battle.fire(0)
		expect(battle.machine.current).toBe("MoveTargetState")

		battle.move(Point.of(-1, 1))
		battle.fire(0)
		expect(battle.machine.current).toBe("MoveSequenceState")
		expect(highlighted(battle)).toEqual([])
		// No input while moving.
		battle.move(Point.of(0, -1))
		expect(battle.pos).toBe(Point.of(1, 2))

		await advance(1)
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(walker.tile?.pos).toBe(Point.of(1, 2))
		expect(walker.transform.localPosition).toEqual([1, 0.5, 2])
		expect(battle.turn.hasUnitMoved).toBe(true)
		expect(menu(battle)).toMatchObject({
			entries: ["(Move)", "Action", "Wait"],
			selected: "Action"
		})
	})

	test("cancelling goes back to the commands", async () => {
		const battle = await started()
		battle.fire(0)
		battle.fire(1)
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(highlighted(battle)).toEqual([])
	})

	test("cancelling in the commands undoes the move", async () => {
		const battle = await started()
		const walker = battle.units[0]!
		battle.fire(0)
		battle.move(Point.of(0, 1))
		battle.fire(0)
		await advance(1)

		battle.fire(1)
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(walker.tile?.pos).toBe(Point.of(1, 1))
		expect(walker.transform.localPosition).toEqual([1, 0.5, 1])
		expect(battle.pos).toBe(Point.of(1, 1))
		expect(battle.turn.hasUnitMoved).toBe(false)
		expect(menu(battle)).toMatchObject({ entries: ["Move", "Action", "Wait"], selected: "Action" })
	})
})

describe("CategorySelectionState and ActionSelectionState", () => {
	test("attacking uses the action and locks the move it followed", async () => {
		const battle = await started()
		battle.fire(0)
		battle.move(Point.of(0, 1))
		battle.fire(0)
		await advance(1)

		// Action
		battle.fire(0)
		expect(battle.machine.current).toBe("CategorySelectionState")
		expect(menu(battle)).toEqual({
			title: "Action",
			entries: ["Attack", "White Magic", "Black Magic"],
			selected: "Attack"
		})
		battle.fire(0)

		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(menu(battle)).toMatchObject({
			entries: ["(Move)", "(Action)", "Wait"],
			selected: "Wait"
		})
		// The move can't be undone any more.
		battle.fire(1)
		expect(battle.machine.current).toBe("ExploreState")
		expect(battle.units[0]!.tile?.pos).toBe(Point.of(1, 2))
	})

	test("a category lists its abilities; cancelling goes back a menu at a time", async () => {
		const battle = await started()
		battle.move(Point.of(0, -1))
		battle.fire(0)
		battle.move(Point.of(0, -1))
		battle.move(Point.of(0, -1))
		battle.fire(0)
		expect(battle.machine.current).toBe("ActionSelectionState")
		expect(menu(battle)).toEqual({
			title: "Black Magic",
			entries: ["Fire", "Ice", "Lightning"],
			selected: "Fire"
		})

		battle.fire(1)
		expect(battle.machine.current).toBe("CategorySelectionState")
		battle.move(Point.of(0, -1))
		battle.fire(0)
		expect(menu(battle).title).toBe("White Magic")
		battle.fire(1)
		battle.fire(1)
		expect(battle.machine.current).toBe("CommandSelectionState")
	})

	test("using an ability ends the action without locking an unmade move", async () => {
		const battle = await started()
		battle.move(Point.of(0, -1))
		battle.fire(0)
		battle.move(Point.of(0, -1))
		battle.fire(0)
		battle.fire(0)

		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(battle.turn).toMatchObject({ hasUnitActed: true, lockMove: false })
		expect(menu(battle)).toMatchObject({ entries: ["Move", "(Action)", "Wait"], selected: "Move" })
	})
})
