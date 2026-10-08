import { beforeEach, describe, expect, expectTypeOf, test, vi } from "vitest"
import { Resources } from "#lib/common/unity/Resources.ts"
import type { LevelData } from "#lib/model/LevelData.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Point } from "#lib/model/Point.ts"
import { Ability } from "#lib/view-model-component/ability/Ability.ts"
import { FullAbilityArea } from "#lib/view-model-component/ability/area-of-effect/FullAbilityArea.ts"
import { DefaultAbilityEffectTarget } from "#lib/view-model-component/ability/effect-target/DefaultAbilityEffectTarget.ts"
import { DamageAbilityEffect } from "#lib/view-model-component/ability/effects/DamageAbilityEffect.ts"
import { ATypeHitRate } from "#lib/view-model-component/ability/hit-rate/ATypeHitRate.ts"
import { LineAbilityRange } from "#lib/view-model-component/ability/range/LineAbilityRange.ts"
import { Rank } from "#lib/view-model-component/actor/Rank.ts"
import type { StatPanel } from "#lib/view-model-component/StatPanel.svelte.ts"
import { Health } from "#lib/view-model-component/actor/Health.ts"
import { Mana } from "#lib/view-model-component/actor/Mana.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { advance, useFakeTime } from "#lib/testing/time.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { BattleController } from "./BattleController.svelte.ts"
import { TurnOrderController } from "./TurnOrderController.ts"

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
		expectTypeOf(battle.machine.current).toEqualTypeOf<
			| "None"
			| "AbilityTargetState"
			| "ActionSelectionState"
			| "CategorySelectionState"
			| "CommandSelectionState"
			| "ConfirmAbilityTargetState"
			| "CutSceneState"
			| "EndFacingState"
			| "ExploreState"
			| "InitBattleState"
			| "MoveSequenceState"
			| "MoveTargetState"
			| "PerformAbilityState"
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
			["Rogue", Point.of(1, 1), "Rogue", "WalkMovement"],
			["Warrior", Point.of(0, 1), "Warrior", "WalkMovement"],
			["Wizard", Point.of(2, 1), "Wizard", "WalkMovement"]
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
		expect(warrior.get(StatTypes.MP)).toBe(warrior.get(StatTypes.MMP))

		// The blog's Hero prefab: an Attack, and an ability catalog.
		const [rogue] = battle.units as [Unit]
		expect([rogue.health, rogue.mana, rogue.undead]).toEqual([
			expect.any(Health),
			expect.any(Mana),
			null
		])
		expect(rogue.attack?.name).toBe("Attack")
		expect(
			rogue.abilityCatalog?.categories.map((c) => [c.name, c.abilities.map((a) => a.name)])
		).toEqual([
			["White Magic", ["Cure", "Raise", "Holy"]],
			["Sagacity Skill", ["Water", "Blind", "Drain"]]
		])
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
	test("the turn order picks the actor, whose commands open a frame later", async () => {
		const battle = await started()
		const [rogue, warrior] = battle.units as [Unit, Unit]
		const ctr = (u: Unit) => u.stats.get(StatTypes.CTR)
		// The Rogue is the fastest: first over 1000.
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
			entries: ["Cure: 6", "Raise: 22", "(Holy: 32)"],
			selected: "Cure: 6"
		})

		battle.fire(1)
		rogue.stats.set(StatTypes.MP, 5)
		battle.move(Point.of(0, -1))
		battle.fire(0)
		expect(menu(battle).entries).toEqual(["(Cure: 6)", "(Raise: 22)", "(Holy: 32)"])
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

		// Cure the Rogue and the units next to it: they heal by Cure's power, up to their max HP.
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
		expect(shown(battle)).toBe("Rogue")
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
		expect(shown(battle)).toBe("Rogue")
		battle.move(Point.of(0, 1))
		expect(shown(battle)).toBeNull()
		battle.move(Point.of(1, -1))
		expect(shown(battle)).toBe("Wizard")
		expect(battle.statPanelController.primaryPanel.lvLabel).toBe("LV. 10")

		battle.fire(0)
		battle.fire(0)
		expect(battle.machine.current).toBe("MoveTargetState")
		expect(shown(battle)).toBe("Rogue")
		battle.move(Point.of(0, 1))
		expect(shown(battle)).toBeNull()
	})
})

/** From the commands to the attack's target selection. */
function attack(battle: BattleController) {
	battle.move(Point.of(0, -1))
	battle.fire(0)
	battle.fire(0)
	expect(battle.machine.current).toBe("AbilityTargetState")
}

/**
 * A row of tiles from (0, 1) to (6, 1). The heroes start at (1, 1), (0, 1) and (2, 1): the
 * Rogue's attack reaches (4, 1), and its area there holds no one.
 */
const row: LevelData = {
	tiles: [1, 0, 2, 3, 4, 5, 6].map((x) => [x, 2, 1])
}

describe("AbilityTargetState", () => {
	test("shows the attack's range; the cursor shows who is under it", async () => {
		const battle = await started()
		const [rogue, warrior] = battle.units as [Unit, Unit]
		attack(battle)
		// The test heroes' attack reaches 3 tiles.
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

	test("a direction oriented range turns the actor instead of moving the cursor", async () => {
		const battle = await started()
		const [rogue, warrior] = battle.units as [Unit, Unit]
		const range = new LineAbilityRange(rogue, { horizontal: 9 })
		rogue.attack = new Ability(
			{
				name: "Line",
				range,
				area: new FullAbilityArea(range),
				effects: [
					{
						name: "Damage",
						target: new DefaultAbilityEffectTarget(),
						hitRate: new ATypeHitRate(rogue, battle),
						effect: new DamageAbilityEffect(rogue, battle)
					}
				]
			},
			battle
		)
		attack(battle)
		// Facing north. The secondary panel shows whoever is under the cursor: the actor.
		expect(highlighted(battle)).toEqual(["(1,2)"])
		expect(shownHp(battle.statPanelController.secondaryPanel)).toBe(hp(rogue))

		battle.move(Point.of(0, -1))
		expect(battle.pos).toBe(Point.of(1, 1))
		expect(rogue.dir).toBe(Directions.South)
		expect(highlighted(battle)).toEqual(["(1,0)"])

		battle.move(Point.of(-1, 0))
		expect(rogue.dir).toBe(Directions.West)
		expect(rogue.transform.localEulerAngles).toEqual([0, 270, 0])
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

		// Aimed at the Rogue's own tile; the area reaches 1 tile further.
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
		// Everyone has 50 evade. The Rogue faces north: an attack on itself counts as from the side.
		// The Wizard, east of it, faces it; the Warrior, west of it, turns its back.
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
		expect(rogue.transform.localEulerAngles).toEqual([0, 90, 0])
		// Cancelling turns back.
		battle.fire(1)
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(rogue.dir).toBe(Directions.North)
		expect(rogue.transform.localEulerAngles).toEqual([0, 0, 0])
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
		battle.move(Point.of(0, 1))
		battle.fire(0)
		expect(battle.machine.current).toBe("EndFacingState")

		battle.move(Point.of(0, -1))
		expect(rogue.dir).toBe(Directions.South)
		battle.fire(0)
		expect(battle.machine.current).toBe("SelectUnitState")
		expect(rogue.dir).toBe(Directions.South)
		expect(rogue.transform.localEulerAngles).toEqual([0, 180, 0])
	})
})
