import { beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest"
import type { LevelData } from "#lib/model/LevelData.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Point } from "#lib/model/Point.ts"
import { Alliances } from "#lib/enums/Alliances.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { Targets } from "#lib/enums/Targets.ts"
import { toYaw } from "#lib/extensions/DirectionsExtensions.ts"
import Attack from "#lib/resources/Abilities/Common/Attack.ts"
import Level_0 from "#lib/resources/Levels/Level_0.ts"
import { spawn } from "#lib/testing/spawn.ts"
import { advance, useFakeTime } from "#lib/testing/time.ts"
import {
	instantiateAbility,
	type AbilityPrefab
} from "#lib/view-model-component/ability/AbilityPrefab.ts"
import { PlanOfAttack } from "#lib/view-model-component/ai/PlanOfAttack.ts"
import type { StatPanel } from "#lib/view-model-component/StatPanel.svelte.ts"
import { KnockOutStatusEffect } from "#lib/view-model-component/status/effects/KnockOutStatusEffect.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { BattleController, type BattleOptions } from "./BattleController.svelte.ts"
import { TurnOrderController } from "./TurnOrderController.ts"
import type { BattleStateName } from "./battle-states/BattleState.ts"
import { DefeatTargetVictoryCondition } from "./victory-conditions/DefeatTargetVictoryCondition.ts"

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

beforeEach(useFakeTime)

/**
 * The heroes, at level 10: Kamau (a rogue) at (1, 1), Alaois (a warrior) at (0, 1) and Hania (a
 * wizard) at (2, 1). Kamau is the fastest, so goes first.
 */
const heroes = spawn(
	{ recipe: "Kamau", at: Point.of(1, 1) },
	{ recipe: "Alaois", at: Point.of(0, 1) },
	{ recipe: "Hania", at: Point.of(2, 1) }
)

/** A battle past its intro conversation, at the first unit's command menu. */
async function started(levelData = plus, spawnTestUnits = heroes, options: BattleOptions = {}) {
	const battle = new BattleController(levelData, { seed: 1, spawnTestUnits, ...options })
	battle.start()
	await advance(0.1)
	expect(battle.machine.current).toBe("CutSceneState")
	battle.machine.done()
	await advance(0.1)
	expect(battle.machine.current).toBe("CommandSelectionState")
	return battle
}

const highlighted = (battle: BattleController) =>
	[...battle.board.tiles.values()].filter((t) => t.color !== "#ffffff").map((t) => `${t.pos}`)

/** The HP label of a stat panel that is showing, or `null`. */
const shownHp = (panel: StatPanel) =>
	panel.panel.currentPosition?.name === "Show" ? panel.hpLabel : null

/** What a stat panel shows for `unit`'s HP. */
const hp = (unit: Unit) => `HP ${unit.stats.get(StatTypes.HP)} / ${unit.stats.get(StatTypes.MHP)}`

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
		// The states' handlers return `BattleStateName`s; the machine checks those against its own.
		expectTypeOf(battle.machine.current).toEqualTypeOf<"None" | BattleStateName>()
		expectTypeOf(battle.machine.start).parameters.toEqualTypeOf<[]>()
		expectTypeOf(battle.machine.move).parameters.toEqualTypeOf<[Point]>()
		// @ts-expect-error Not an action.
		expect(() => battle.machine.jump()).not.toThrow()
	})

	test("starts with no state, like Unity's StateMachine", () => {
		expect(new BattleController(plus).machine.current).toBe("None")
	})
})

describe("InitBattleState", () => {
	test("loads the level and spawns the units, selects the first one, then hands over a frame later", async () => {
		const battle = new BattleController(Level_0)
		battle.start()

		expect(battle.machine.current).toBe("InitBattleState")
		expect(battle.board.tiles.size).toBe(140)
		const { tile } = battle.units[0]!
		expect(battle.pos).toBe(tile!.pos)
		expect(battle.tileSelectionIndicator.position).toEqual(tile!.center)

		await advance(0.1)
		expect(battle.machine.current).toBe("CutSceneState")
	})

	test("spawns three heroes and three enemies at random levels, on random tiles, facing random ways", () => {
		const battle = new BattleController(Level_0)
		battle.start()

		const { Hero, Enemy } = Alliances
		expect(battle.units.map((u) => [u.name, u.model, u.alliance?.type])).toEqual([
			["Alaois", "Hero", Hero],
			["Hania", "Hero", Hero],
			["Kamau", "Hero", Hero],
			["Enemy Rogue", "Monster", Enemy],
			["Enemy Warrior", "Monster", Enemy],
			["Enemy Wizard", "Monster", Enemy]
		])
		for (const unit of battle.units) {
			expect([9, 10, 11]).toContain(unit.stats.get(StatTypes.LVL))
			expect(unit.tile?.content).toBe(unit)
			expect(unit.transform.position).toEqual(unit.tile!.center)
			expect(unit.transform.yaw).toBe(toYaw(unit.dir))
		}
		expect(new Set(battle.units.map((u) => u.tile)).size).toBe(6)
	})

	test("a seed replays the spawn", () => {
		const spawned = (seed: number) => {
			const battle = new BattleController(Level_0, { seed })
			battle.start()
			return battle.units.map((u) => [
				u.tile!.pos,
				u.dir,
				...Object.values(StatTypes)
					.slice(0, -1)
					.map((t) => u.stats.get(t as StatTypes))
			])
		}
		expect(spawned(5)).toEqual(spawned(5))
		expect(spawned(5)).not.toEqual(spawned(6))
	})

	test("ignores input while it initializes", () => {
		const battle = new BattleController(plus, { spawnTestUnits: heroes })
		battle.start()
		battle.move(Point.of(0, 1))
		expect(battle.pos).toBe(Point.of(1, 1))
	})
})

describe("SelectUnitState", () => {
	test("the turn order picks the actor, whose commands open a frame later", async () => {
		const battle = await started()
		const [rogue, warrior] = battle.units as [Unit, Unit]
		const ctr = (u: Unit) => u.stats.get(StatTypes.CTR)
		// Kamau is the fastest: first over 1000.
		expect(battle.turn.actor).toBe(rogue)
		expect(ctr(rogue)).toBeGreaterThanOrEqual(1000)
		expect(battle.units.map(ctr).filter((c) => c >= 1000)).toEqual([ctr(rogue)])

		let charged: number | null = null
		battle.notifications.addObserver((unit) => {
			charged = ctr(unit)
		}, TurnOrderController.turnCompletedNotification)
		const before = ctr(rogue)

		// Wait, then keep facing north.
		battle.move(Point.of(0, 1))
		battle.fire(0)
		battle.fire(0)
		expect(battle.machine.current).toBe("SelectUnitState")
		expect(charged).toBe(before - 500)
		expect(battle.turn.actor).toBe(warrior)
		expect(battle.pos).toBe(warrior.tile!.pos)
		expect(shownHp(battle.statPanelController.primaryPanel)).toBe(hp(warrior))

		await advance(0.1)
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(menu(battle).title).toBe("Commands")
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
		expect(walker.transform.position).toEqual([1, 0.5, -2])
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
		expect(walker.transform.position).toEqual([1, 0.5, -1])
		expect(battle.pos).toBe(Point.of(1, 1))
		expect(battle.turn.hasUnitMoved).toBe(false)
		expect(menu(battle)).toMatchObject({ entries: ["Move", "Action", "Wait"], selected: "Action" })
	})
})

describe("CategorySelectionState and ActionSelectionState", () => {
	test("Attack aims the actor's attack", async () => {
		const battle = await started()
		battle.move(Point.of(0, -1))
		battle.fire(0)
		expect(battle.machine.current).toBe("CategorySelectionState")
		expect(menu(battle)).toEqual({
			title: "Action",
			entries: ["Attack", "White Magic", "Sagacity Skill"],
			selected: "Attack"
		})
		battle.fire(0)
		expect(battle.machine.current).toBe("AbilityTargetState")
		expect(battle.turn.ability).toBe(battle.units[0]!.attack)
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
			title: "Sagacity Skill",
			entries: ["Water: 12", "Blind: 12", "Drain: 12"],
			selected: "Water: 12"
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

	test("abilities the actor lacks the MP for are locked", async () => {
		const battle = await started()
		const [rogue] = battle.units as [Unit]
		rogue.stats.set(StatTypes.MP, 22)
		battle.move(Point.of(0, -1))
		battle.fire(0)
		battle.move(Point.of(0, -1))
		battle.fire(0)
		expect(menu(battle)).toEqual({
			title: "White Magic",
			entries: ["Cure: 6", "Raise: 22", "(Holy: 32)", "Esuna: 18"],
			selected: "Cure: 6"
		})

		battle.fire(1)
		rogue.stats.set(StatTypes.MP, 5)
		battle.move(Point.of(0, -1))
		battle.fire(0)
		expect(menu(battle).entries).toEqual(["(Cure: 6)", "(Raise: 22)", "(Holy: 32)", "(Esuna: 18)"])

		// PORT-FIX: Unity would go on to aim Cure.
		battle.fire(0)
		expect(battle.machine.current).toBe("ActionSelectionState")
		battle.fire(1)
		expect(battle.machine.current).toBe("CategorySelectionState")
	})

	test("an ability aims; performing it spends its MP and ends the action", async () => {
		const battle = await started()
		const [rogue] = battle.units as [Unit]
		vi.spyOn(battle.random, "rangeFloat").mockReturnValue(1)
		rogue.stats.set(StatTypes.HP, 1)
		const mp = rogue.stats.get(StatTypes.MP)
		battle.move(Point.of(0, -1))
		battle.fire(0)
		battle.move(Point.of(0, -1))
		battle.fire(0)
		battle.fire(0)
		expect(battle.machine.current).toBe("AbilityTargetState")
		const cure = rogue.abilityCatalog!.getAbility(0, 0)!
		expect(battle.turn.ability).toBe(cure)

		// Cure Kamau and the units next to it: they heal by Cure's power, up to their max HP.
		battle.fire(0)
		expect(battle.machine.current).toBe("ConfirmAbilityTargetState")
		const healing = cure.effects[0]!.effect.predict(rogue.tile!)
		expect(battle.hitSuccessIndicator).toMatchObject({
			label: `100% ${healing}pt(s)`,
			labelColor: "#00ff00"
		})
		battle.fire(0)
		await advance(0.1)
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(rogue.stats.get(StatTypes.MP)).toBe(mp - 6)
		expect(rogue.stats.get(StatTypes.HP)).toBe(1 + healing)
		expect(battle.units.slice(1).map((u) => u.stats.get(StatTypes.HP))).toEqual(
			battle.units.slice(1).map((u) => u.stats.get(StatTypes.MHP))
		)
		expect(battle.turn).toMatchObject({ hasUnitActed: true, lockMove: false })
		expect(menu(battle)).toMatchObject({ entries: ["Move", "(Action)", "Wait"], selected: "Move" })
	})
})

describe("stat panel", () => {
	const shown = (battle: BattleController) => {
		const { primaryPanel } = battle.statPanelController
		return primaryPanel.panel.currentPosition?.name === "Show" ? primaryPanel.nameLabel : null
	}

	test("the menus show the actor's stats", async () => {
		const battle = await started()
		battle.units[0]!.stats.setValue(StatTypes.HP, 12, false)
		battle.fire(1)
		battle.fire(0)
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(shown(battle)).toBe("Kamau")
		expect(battle.statPanelController.primaryPanel.hpLabel).toMatch(/^HP 12 \//)

		battle.fire(0)
		battle.move(Point.of(0, 1))
		battle.fire(0)
		expect(battle.machine.current).toBe("MoveSequenceState")
		expect(shown(battle)).toBeNull()
	})

	test("exploring and moving show whoever is under the cursor", async () => {
		const battle = await started()
		battle.fire(1)
		expect(battle.machine.current).toBe("ExploreState")
		expect(shown(battle)).toBe("Kamau")
		battle.move(Point.of(0, 1))
		expect(shown(battle)).toBeNull()
		battle.move(Point.of(1, -1))
		expect(shown(battle)).toBe("Hania")
		expect(battle.statPanelController.primaryPanel.lvLabel).toBe("LV. 10")

		battle.fire(0)
		battle.fire(0)
		expect(battle.machine.current).toBe("MoveTargetState")
		expect(shown(battle)).toBe("Kamau")
		battle.move(Point.of(0, 1))
		expect(shown(battle)).toBeNull()
	})
})

/**
 * The blog's demo attack, which its heroes had until the unit factory: 3 tiles' range, and hits
 * 1 tile around where it's aimed (the real one only reaches the tile in front).
 */
const demoAttack: AbilityPrefab = {
	...Attack,
	range: { type: "ConstantAbilityRange", horizontal: 3, vertical: Infinity },
	area: { type: "SpecifyAbilityArea", horizontal: 1, vertical: 1 }
}

/** From the commands to aiming the actor's attack, which becomes `prefab` (by default the demo's). */
function attack(battle: BattleController, prefab: AbilityPrefab = demoAttack) {
	const actor = battle.turn.actor!
	actor.attack = instantiateAbility(prefab, actor, battle)
	battle.move(Point.of(0, -1))
	battle.fire(0)
	battle.fire(0)
	expect(battle.machine.current).toBe("AbilityTargetState")
}

/**
 * A row of tiles from (0, 1) to (6, 1). The heroes start at (1, 1), (0, 1) and (2, 1): Kamau's
 * demo attack reaches (4, 1), and its area there holds no one.
 */
const row: LevelData = {
	tiles: [1, 0, 2, 3, 4, 5, 6].map((x) => [x, 2, 1])
}

describe("AbilityTargetState", () => {
	test("shows the attack's range; the cursor shows who is under it", async () => {
		const battle = await started()
		const [rogue, warrior] = battle.units as [Unit, Unit]
		attack(battle)
		// The demo attack reaches 3 tiles.
		expect(highlighted(battle).sort()).toEqual(["(0,1)", "(1,0)", "(1,1)", "(1,2)", "(2,1)"])
		const { primaryPanel, secondaryPanel } = battle.statPanelController
		expect(shownHp(primaryPanel)).toBe(hp(rogue))
		expect(shownHp(secondaryPanel)).toBeNull()

		battle.move(Point.of(-1, 0))
		expect(battle.pos).toBe(Point.of(0, 1))
		expect(shownHp(secondaryPanel)).toBe(hp(warrior))
		battle.move(Point.of(0, 1))
		expect(battle.pos).toBe(Point.of(0, 1))

		battle.fire(0)
		expect(battle.machine.current).toBe("ConfirmAbilityTargetState")
	})

	test("can't confirm a tile out of range", async () => {
		const battle = await started(row)
		attack(battle)
		expect(highlighted(battle).sort()).toEqual(["(0,1)", "(1,1)", "(2,1)", "(3,1)", "(4,1)"])
		battle.move(Point.of(1, 0))
		battle.move(Point.of(1, 0))
		battle.move(Point.of(1, 0))
		battle.move(Point.of(1, 0))
		expect(battle.pos).toBe(Point.of(5, 1))
		battle.fire(0)
		expect(battle.machine.current).toBe("AbilityTargetState")
	})

	test("cancelling goes back to the categories", async () => {
		const battle = await started()
		attack(battle)
		battle.fire(1)
		expect(battle.machine.current).toBe("CategorySelectionState")
		expect(highlighted(battle)).toEqual([])
		expect(battle.turn.hasUnitActed).toBe(false)
	})

	test("a direction oriented range (the real Attack's) turns the actor instead of moving the cursor", async () => {
		const battle = await started()
		const [rogue, warrior] = battle.units as [Unit, Unit]
		attack(battle, Attack)
		// Facing north. The secondary panel shows whoever is under the cursor: the actor.
		expect(highlighted(battle)).toEqual(["(1,2)"])
		expect(shownHp(battle.statPanelController.secondaryPanel)).toBe(hp(rogue))

		battle.move(Point.of(0, -1))
		expect(battle.pos).toBe(Point.of(1, 1))
		expect(rogue.dir).toBe(Directions.South)
		expect(highlighted(battle)).toEqual(["(1,0)"])

		battle.move(Point.of(-1, 0))
		expect(rogue.dir).toBe(Directions.West)
		expect(rogue.transform.yaw).toBe(toYaw(Directions.West))
		expect(highlighted(battle)).toEqual(["(0,1)"])

		// Confirms the direction: the area is the whole range.
		battle.fire(0)
		expect(battle.machine.current).toBe("ConfirmAbilityTargetState")
		expect(highlighted(battle)).toEqual(["(0,1)"])
		expect(battle.turn.targets).toEqual([warrior.tile])
	})
})

describe("ConfirmAbilityTargetState", () => {
	test("shows the area around the aimed tile; moving cycles through the targets in it", async () => {
		const battle = await started()
		const [rogue, warrior, wizard] = battle.units as [Unit, Unit, Unit]
		attack(battle)
		battle.fire(0)
		expect(battle.machine.current).toBe("ConfirmAbilityTargetState")

		// Aimed at Kamau's own tile; the area reaches 1 tile further.
		expect(highlighted(battle).sort()).toEqual(["(0,1)", "(1,0)", "(1,1)", "(1,2)", "(2,1)"])
		expect(battle.turn.targets).toEqual([rogue.tile, wizard.tile, warrior.tile])
		const { primaryPanel, secondaryPanel } = battle.statPanelController
		expect(shownHp(primaryPanel)).toBe(hp(rogue))
		expect(shownHp(secondaryPanel)).toBe(hp(rogue))

		battle.move(Point.of(1, 0))
		expect(shownHp(secondaryPanel)).toBe(hp(wizard))
		battle.move(Point.of(0, 1))
		expect(shownHp(secondaryPanel)).toBe(hp(warrior))
		battle.move(Point.of(0, 1))
		expect(shownHp(secondaryPanel)).toBe(hp(rogue))
		battle.move(Point.of(-1, 0))
		expect(shownHp(secondaryPanel)).toBe(hp(warrior))
		battle.move(Point.of(0, -1))
		expect(shownHp(secondaryPanel)).toBe(hp(wizard))
		expect(battle.pos).toBe(Point.of(1, 1))
	})

	test("the hit success indicator shows the chance to hit the target, and the damage", async () => {
		const battle = await started()
		const [rogue, warrior, wizard] = battle.units as [Unit, Unit, Unit]
		const damage = (unit: Unit) => -rogue.attack!.effects[0]!.effect.predict(unit.tile!)
		// Everyone has 50 evade. Kamau faces north: an attack on itself counts as from the side.
		// Hania, east of it, faces it; Alaois, west of it, turns its back.
		wizard.dir = Directions.West
		warrior.dir = Directions.West
		const indicator = battle.hitSuccessIndicator
		const shown = () => ({
			active: indicator.canvasActive,
			at: indicator.panel.currentPosition?.name,
			label: indicator.label,
			fill: indicator.fillAmount,
			color: indicator.labelColor
		})
		expect(shown()).toMatchObject({ active: false, at: "Hide" })

		attack(battle)
		battle.fire(0)
		const label = `75% ${damage(rogue)}pt(s)`
		expect(shown()).toEqual({ active: true, at: "Show", label, fill: 0.75, color: "#ff0000" })
		battle.move(Point.of(1, 0))
		expect(shown()).toMatchObject({ label: `50% ${damage(wizard)}pt(s)`, fill: 0.5 })
		battle.move(Point.of(1, 0))
		expect(shown()).toMatchObject({ label: `88% ${damage(warrior)}pt(s)`, fill: 0.88 })

		battle.fire(1)
		expect(shown()).toMatchObject({ active: true, at: "Hide" })
		await advance(0.6)
		expect(shown()).toMatchObject({ active: false, at: "Hide" })
	})

	test("only targets units with hit points left", async () => {
		const battle = await started()
		const [rogue, warrior] = battle.units as [Unit, Unit]
		rogue.stats.setValue(StatTypes.HP, 0, false)
		attack(battle)
		battle.move(Point.of(-1, 0))
		battle.fire(0)
		expect(highlighted(battle).sort()).toEqual(["(0,1)", "(1,1)"])
		expect(battle.turn.targets).toEqual([warrior.tile])
	})

	test("can't perform without targets; cancelling aims again", async () => {
		const battle = await started(row)
		attack(battle)
		battle.move(Point.of(1, 0))
		battle.move(Point.of(1, 0))
		battle.move(Point.of(1, 0))
		battle.fire(0)
		expect(battle.machine.current).toBe("ConfirmAbilityTargetState")
		expect(highlighted(battle).sort()).toEqual(["(3,1)", "(4,1)", "(5,1)"])
		expect(battle.turn.targets).toEqual([])
		expect(shownHp(battle.statPanelController.secondaryPanel)).toBeNull()
		expect(battle.hitSuccessIndicator.canvasActive).toBe(false)

		battle.fire(0)
		expect(battle.machine.current).toBe("ConfirmAbilityTargetState")
		battle.fire(1)
		expect(battle.machine.current).toBe("AbilityTargetState")
		expect(battle.pos).toBe(Point.of(4, 1))
		expect(highlighted(battle)).toHaveLength(5)
	})
})

describe("PerformAbilityState and EndFacingState", () => {
	test("performing uses the action and applies the attack to each target a frame later", async () => {
		const battle = await started()
		const [rogue, warrior, wizard] = battle.units as [Unit, Unit, Unit]
		// Every roll hits, with no variance.
		vi.spyOn(battle.random, "rangeInt").mockReturnValue(0)
		vi.spyOn(battle.random, "rangeFloat").mockReturnValue(1)
		const hpBefore = battle.units.map((u) => u.stats.get(StatTypes.HP))
		const [damage] = rogue.attack!.effects
		const predicted = [rogue, warrior].map((u) => damage!.effect.predict(u.tile!))
		expect(predicted.every((amount) => amount < 0)).toBe(true)
		attack(battle)
		battle.move(Point.of(-1, 0))
		battle.fire(0)
		expect(battle.turn.targets).toEqual([warrior.tile, rogue.tile])

		battle.fire(0)
		expect(battle.machine.current).toBe("PerformAbilityState")
		expect(highlighted(battle)).toEqual([])
		expect(battle.turn).toMatchObject({ hasUnitActed: true, lockMove: false })
		expect(rogue.stats.get(StatTypes.HP)).toBe(hpBefore[0])

		await advance(0.1)
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect([rogue, warrior, wizard].map((u) => u.stats.get(StatTypes.HP))).toEqual([
			hpBefore[0]! + predicted[0]!,
			hpBefore[1]! + predicted[1]!,
			hpBefore[2]
		])
		expect(menu(battle)).toMatchObject({ entries: ["Move", "(Action)", "Wait"], selected: "Move" })
	})

	test("after a move, performing locks it and goes on to pick the actor's facing", async () => {
		const battle = await started()
		const rogue = battle.units[0]!
		battle.fire(0)
		battle.move(Point.of(0, 1))
		battle.fire(0)
		await advance(1)
		expect(battle.pos).toBe(Point.of(1, 2))
		// Action, Attack; aimed at itself.
		rogue.attack = instantiateAbility(demoAttack, rogue, battle)
		battle.fire(0)
		battle.fire(0)
		battle.fire(0)
		expect(battle.turn.targets).toEqual([rogue.tile])
		battle.fire(0)
		await advance(0.1)

		expect(battle.machine.current).toBe("EndFacingState")
		expect(battle.turn).toMatchObject({ hasUnitMoved: true, hasUnitActed: true, lockMove: true })
		battle.move(Point.of(1, 0))
		expect(rogue.dir).toBe(Directions.East)
		expect(rogue.transform.yaw).toBe(toYaw(Directions.East))
		// Cancelling turns back.
		battle.fire(1)
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(rogue.dir).toBe(Directions.North)
		expect(rogue.transform.yaw).toBe(toYaw(Directions.North))
		expect(menu(battle)).toMatchObject({
			entries: ["(Move)", "(Action)", "Wait"],
			selected: "Wait"
		})
		// The move can't be undone any more.
		battle.fire(1)
		expect(battle.machine.current).toBe("ExploreState")
		expect(rogue.tile?.pos).toBe(Point.of(1, 2))
	})

	test("Wait picks the facing too; confirming ends the turn", async () => {
		const battle = await started()
		const rogue = battle.units[0]!
		expect(battle.facingIndicator.active).toBe(false)
		battle.move(Point.of(0, 1))
		battle.fire(0)
		expect(battle.machine.current).toBe("EndFacingState")
		expect(battle.facingIndicator).toMatchObject({ active: true, direction: Directions.North })

		battle.move(Point.of(0, -1))
		expect(rogue.dir).toBe(Directions.South)
		expect(battle.facingIndicator.direction).toBe(Directions.South)
		battle.fire(0)
		expect(battle.machine.current).toBe("SelectUnitState")
		expect(battle.facingIndicator.active).toBe(false)
		expect(rogue.dir).toBe(Directions.South)
		expect(rogue.transform.yaw).toBe(toYaw(Directions.South))
	})
})

/** Every roll hits, with no variance. */
const sure = (battle: BattleController) => {
	vi.spyOn(battle.random, "rangeInt").mockReturnValue(0)
	vi.spyOn(battle.random, "rangeFloat").mockReturnValue(1)
}

/** Plays the conversation through (`count` messages), to its end. */
async function converse(battle: BattleController, count: number) {
	for (let i = 0; i < count; ++i) {
		await advance(1.2)
		battle.fire(0)
	}
	await advance(0.6)
}

describe("knock outs and victory conditions", () => {
	/** Kamau at (1, 1) and Alaois at (0, 1) as usual, with an Enemy Wizard at (2, 1). */
	const withEnemy = spawn(
		{ recipe: "Kamau", at: Point.of(1, 1) },
		{ recipe: "Alaois", at: Point.of(0, 1) },
		{ recipe: "Enemy Wizard", at: Point.of(2, 1) }
	)

	test("the heroes must defeat the last unit, who can't drop below 10 HP", async () => {
		const battle = await started(plus, withEnemy)
		const enemy = battle.units[2]!
		expect(battle.victoryCondition).toBeInstanceOf(DefeatTargetVictoryCondition)
		expect((battle.victoryCondition as DefeatTargetVictoryCondition).target).toBe(enemy)
		expect(enemy.health?.minHP).toBe(10)
	})

	test("an actor that knocks itself out loses the rest of its turn", async () => {
		const battle = await started()
		const [rogue] = battle.units as [Unit]
		sure(battle)
		rogue.stats.set(StatTypes.HP, 1)
		attack(battle)
		battle.move(Point.of(-1, 0))
		battle.fire(0)
		battle.fire(0)
		await advance(0.1)

		expect(rogue.stats.get(StatTypes.HP)).toBe(0)
		expect(rogue.status.getEffect(KnockOutStatusEffect)).not.toBeNull()
		expect(rogue.transform.scale).toEqual([0.75, 0.1, 0.75])
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(battle.turn.actor).not.toBe(rogue)
	})

	test("defeating the target plays the winning outro, then starts over", async () => {
		const loadLevel = vi.fn()
		const battle = await started(plus, withEnemy, { loadLevel })
		const enemy = battle.units[2]!
		sure(battle)
		enemy.stats.set(StatTypes.HP, 11)
		attack(battle)
		battle.move(Point.of(1, 0))
		battle.fire(0)
		expect(battle.turn.targets).toContain(enemy.tile)
		battle.fire(0)
		await advance(0.1)

		expect(enemy.stats.get(StatTypes.HP)).toBe(10)
		expect(battle.victoryCondition?.victor).toBe(Alliances.Hero)
		expect(battle.machine.current).toBe("CutSceneState")
		expect(battle.conversationController.rightPanel.message).toBe("I lost?  How could this happen?")

		await converse(battle, 5)
		expect(battle.machine.current).toBe("EndBattleState")
		expect(loadLevel).toHaveBeenCalledOnce()
	})

	test("the heroes all defeated: the losing outro", async () => {
		const loadLevel = vi.fn()
		const battle = await started(plus, withEnemy, { loadLevel })
		const [rogue, warrior] = battle.units as [Unit, Unit]
		sure(battle)
		warrior.stats.set(StatTypes.HP, 0)
		rogue.stats.set(StatTypes.HP, 1)
		attack(battle)
		battle.move(Point.of(0, 1))
		battle.fire(0)
		expect(battle.turn.targets).toEqual([rogue.tile])
		battle.fire(0)
		await advance(0.1)

		expect(battle.victoryCondition?.victor).toBe(Alliances.Enemy)
		expect(battle.machine.current).toBe("CutSceneState")
		expect(battle.conversationController.rightPanel.message).toBe("I told you to be afraid.")
		await converse(battle, 5)
		expect(battle.machine.current).toBe("EndBattleState")
		expect(loadLevel).toHaveBeenCalledOnce()
	})
})

describe("the computer's turn", () => {
	/**
	 * On `row`: an Enemy Warrior at (0, 1), made the fastest so that it goes first; Kamau at (3, 1);
	 * an Enemy Wizard at (6, 1). The computer's plan for the warrior is `plan`.
	 */
	const computerFirst =
		(plan: (warrior: Unit) => Partial<PlanOfAttack>) => (battle: BattleController) => {
			spawn(
				{ recipe: "Enemy Warrior", at: Point.of(0, 1) },
				{ recipe: "Kamau", at: Point.of(3, 1) },
				{ recipe: "Enemy Wizard", at: Point.of(6, 1) }
			)(battle)
			const warrior = battle.units[0]!
			warrior.stats.set(StatTypes.SPD, 200)
			vi.spyOn(battle.cpu, "evaluate").mockImplementation(() =>
				Object.assign(new PlanOfAttack(), plan(warrior))
			)
		}

	/** To (2, 1), then attack east: Kamau. */
	const attackKamau = computerFirst((warrior) => ({
		ability: warrior.attack,
		target: Targets.Foe,
		moveLocation: Point.of(2, 1),
		attackDirection: Directions.East
	}))

	/** Runs the clocks until the battle is in `state`, and returns how long that took (seconds). */
	async function until(battle: BattleController, state: BattleStateName): Promise<number> {
		let seconds = 0
		while (battle.machine.current !== state) {
			if (seconds > 10) throw new Error(`Still in ${battle.machine.current} after 10 s`)
			await advance(0.01)
			seconds += 0.01
		}
		return seconds
	}

	test("plans the turn, shows no menu, and ignores the player", async () => {
		const battle = await started(row, attackKamau)
		const [warrior] = battle.units as [Unit]
		expect(battle.turn.actor).toBe(warrior)
		expect(battle.cpu.evaluate).toHaveBeenCalledOnce()
		expect(battle.turn.plan?.moveLocation).toBe(Point.of(2, 1))
		expect(battle.turn.ability).toBe(warrior.attack)
		expect(battle.abilityMenuPanelController.canvasActive).toBe(false)
		expect(shownHp(battle.statPanelController.primaryPanel)).toBe(hp(warrior))

		battle.move(Point.of(0, 1))
		battle.fire(0)
		battle.fire(1)
		expect(battle.machine.current).toBe("CommandSelectionState")
	})

	test("moves the cursor a step at a time to where it moves, attacks, then faces a way", async () => {
		const battle = await started(row, attackKamau)
		const [warrior, kamau] = battle.units as [Unit, Unit]
		sure(battle)
		vi.spyOn(battle.cpu, "determineEndFacingDirection").mockReturnValue(Directions.South)
		const kamauHp = kamau.stats.get(StatTypes.HP)

		// A second after its turn starts (just under, as the turn started a frame into `started`).
		expect(await until(battle, "MoveTargetState")).toBeCloseTo(0.9, 1)
		expect(highlighted(battle).sort()).toEqual(["(1,1)", "(2,1)"])
		expect(battle.pos).toBe(Point.of(1, 1))
		await advance(0.2)
		expect(battle.pos).toBe(Point.of(1, 1))
		await advance(0.1)
		expect(battle.pos).toBe(Point.of(2, 1))
		expect(await until(battle, "MoveSequenceState")).toBeCloseTo(0.7, 1)

		await until(battle, "CommandSelectionState")
		expect(warrior.tile?.pos).toBe(Point.of(2, 1))
		expect(battle.cpu.evaluate).toHaveBeenCalledOnce()
		expect(await until(battle, "AbilityTargetState")).toBeCloseTo(1, 1)
		expect(warrior.dir).toBe(Directions.East)
		expect(highlighted(battle)).toEqual(["(3,1)"])

		expect(await until(battle, "ConfirmAbilityTargetState")).toBeCloseTo(0.75, 1)
		expect(battle.turn.targets).toEqual([kamau.tile])
		expect(battle.hitSuccessIndicator.canvasActive).toBe(false)
		expect(battle.battleMessageController).toMatchObject({ canvasActive: true, label: "Attack" })

		expect(await until(battle, "PerformAbilityState")).toBeCloseTo(2, 1)
		await until(battle, "EndFacingState")
		expect(kamau.stats.get(StatTypes.HP)).toBeLessThan(kamauHp)
		expect(battle.facingIndicator).toMatchObject({ active: true, direction: Directions.East })
		await advance(0.55)
		expect(warrior.dir).toBe(Directions.South)
		expect(battle.facingIndicator.direction).toBe(Directions.South)

		await until(battle, "CommandSelectionState")
		expect(battle.turn).toMatchObject({ actor: kamau, plan: null })
		expect(menu(battle).title).toBe("Commands")
	})

	test("with no ability to use, it only moves, then ends its turn", async () => {
		const battle = await started(
			row,
			computerFirst(() => ({ ability: null, moveLocation: Point.of(1, 1) }))
		)
		await until(battle, "MoveSequenceState")
		await until(battle, "CommandSelectionState")
		expect(await until(battle, "EndFacingState")).toBeCloseTo(1, 1)
		expect(battle.turn.hasUnitActed).toBe(false)
		await until(battle, "SelectUnitState")
	})

	test("staying put, it goes straight to aiming", async () => {
		const battle = await started(
			row,
			computerFirst((warrior) => ({ ability: warrior.attack, moveLocation: Point.of(0, 1) }))
		)
		expect(await until(battle, "AbilityTargetState")).toBeCloseTo(0.9, 1)
	})

	test("the player can read the outro when the computer wins the battle", async () => {
		const loadLevel = vi.fn()
		const battle = await started(row, attackKamau, { loadLevel })
		const [, kamau] = battle.units as [Unit, Unit]
		sure(battle)
		kamau.stats.set(StatTypes.HP, 1)

		await until(battle, "CutSceneState")
		expect(battle.victoryCondition?.victor).toBe(Alliances.Enemy)
		expect(battle.conversationController.rightPanel.message).toBe("I told you to be afraid.")
		await converse(battle, 5)
		expect(battle.machine.current).toBe("EndBattleState")
		expect(loadLevel).toHaveBeenCalledOnce()
	})
})
