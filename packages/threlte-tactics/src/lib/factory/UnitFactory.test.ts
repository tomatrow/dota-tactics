import { describe, expect, test, vi } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/unity/Random.ts"
import { Resources } from "#lib/common/unity/Resources.ts"
import { Alliances } from "#lib/enums/Alliances.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { LineAbilityRange } from "#lib/view-model-component/ability/range/LineAbilityRange.ts"
import { Health } from "#lib/view-model-component/actor/Health.ts"
import { Mana } from "#lib/view-model-component/actor/Mana.ts"
import { Rank } from "#lib/view-model-component/actor/Rank.ts"
import { FlyMovement } from "#lib/view-model-component/movement/FlyMovement.ts"
import { TeleportMovement } from "#lib/view-model-component/movement/TeleportMovement.ts"
import { WalkMovement } from "#lib/view-model-component/movement/WalkMovement.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { UnitFactory } from "./UnitFactory.ts"
import type { UnitRecipe } from "./UnitRecipe.ts"

const context = () => ({ notifications: new NotificationCenter(), random: new Random(1) })

const create = (recipe: string, level = 10) => UnitFactory.create(recipe, level, context())!

const catalog = (unit: Unit) =>
	unit.abilityCatalog?.categories.map((c) => [c.name, c.abilities.map((a) => a.name)])

describe("UnitFactory", () => {
	test("builds a hero from its recipe", () => {
		const kamau = create("Kamau")
		expect([kamau.name, kamau.model, kamau.job?.name, kamau.alliance?.type]).toEqual([
			"Kamau",
			"Hero",
			"Rogue",
			Alliances.Hero
		])
		expect(kamau.movement).toBeInstanceOf(WalkMovement)
		expect([kamau.health, kamau.mana, kamau.undead]).toEqual([
			expect.any(Health),
			expect.any(Mana),
			null
		])
		expect(kamau.attack?.name).toBe("Attack")
		expect(kamau.attack?.range).toBeInstanceOf(LineAbilityRange)
		expect(catalog(kamau)).toEqual([
			["White Magic", ["Cure", "Raise", "Holy", "Esuna"]],
			["Sagacity Skill", ["Water", "Blind", "Drain"]]
		])
	})

	test("the enemies: monsters with their own abilities, flying, walking and teleporting", () => {
		const enemies = ["Enemy Rogue", "Enemy Warrior", "Enemy Wizard"].map((name) => create(name))
		expect(
			enemies.map((u) => [u.model, u.job?.name, u.alliance?.type, u.movement?.constructor])
		).toEqual([
			["Monster", "Rogue", Alliances.Enemy, FlyMovement],
			["Monster", "Warrior", Alliances.Enemy, WalkMovement],
			["Monster", "Wizard", Alliances.Enemy, TeleportMovement]
		])
		expect(enemies.map(catalog)).toEqual([
			[
				["Sagacity Skill", ["Blind", "Drain"]],
				["Fighter Tech", ["Air Blast"]]
			],
			[
				["Battle Tech", ["First Aid"]],
				["Monk Tech", ["Earth Render"]]
			],
			[
				["Sagacity Skill", ["Water"]],
				["Phantasm Skill", ["Prominence"]],
				["White Magic", ["Cure"]]
			]
		])
	})

	test("levels the unit up from 1, its job's stats growing, then fills its HP and MP", () => {
		const { LVL, EXP, HP, MHP, MP, MMP, MOV, JMP } = StatTypes
		const units = ["Kamau", "Alaois", "Hania"].map((name) => create(name, 11))
		expect(units.map((u) => [MOV, JMP, LVL, EXP].map((t) => u.stats.get(t)))).toEqual([
			[5, 3, 11, Rank.experienceForLevel(11)],
			[4, 1, 11, Rank.experienceForLevel(11)],
			[3, 2, 11, Rank.experienceForLevel(11)]
		])
		// Ten level ups: a warrior's MHP grows 8 or 9 points each.
		const warrior = units[1]!.stats
		expect(warrior.get(MHP)).toBeGreaterThanOrEqual(43 + 10 * 8)
		expect(warrior.get(MHP)).toBeLessThanOrEqual(43 + 10 * 9)
		for (const { stats } of units) {
			expect(stats.get(HP)).toBe(stats.get(MHP))
			expect(stats.get(MP)).toBe(stats.get(MMP))
		}
	})

	test("builds every recipe", () => {
		const paths = Resources.paths("Unit Recipes")
		expect(paths).toHaveLength(6)
		for (const path of paths) {
			const recipe = Resources.load<UnitRecipe>(path)!
			expect(UnitFactory.create(recipe, 1, context())?.name).toBe(recipe.name)
		}
	})

	test("no recipe by that name: null, and an error logged", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
		expect(UnitFactory.create("Nobody", 1, context())).toBeNull()
		expect(error).toHaveBeenCalledWith("No Unit Recipe for name: Nobody")
	})

	test("an ability catalog recipe that's missing: an empty catalog, and an error logged", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
		const recipe = Resources.load<UnitRecipe>("Unit Recipes/Kamau")!
		const unit = UnitFactory.create({ ...recipe, abilityCatalog: "Nothing" }, 1, context())!
		expect(unit.abilityCatalog?.categoryCount()).toBe(0)
		expect(error).toHaveBeenCalledWith("No Ability Catalog Recipe Found: Nothing")
	})

	test("a prefab that's missing throws (Unity goes on with an empty GameObject)", () => {
		const recipe = Resources.load<UnitRecipe>("Unit Recipes/Kamau")!
		expect(() => UnitFactory.create({ ...recipe, job: "Bard" }, 1, context())).toThrow(
			"No Prefab for name: Jobs/Bard"
		)
	})
})
