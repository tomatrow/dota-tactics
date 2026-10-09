import { describe, expect, test, vi } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/Random.ts"
import { Drivers } from "#lib/enums/Drivers.ts"
import { Targets } from "#lib/enums/Targets.ts"
import { UnitFactory } from "#lib/factory/UnitFactory.ts"
import { Driver } from "#lib/view-model-component/actor/Driver.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { instantiateAttackPattern, type AttackPatternPrefab } from "./AttackPatternPrefab.ts"
import { PlanOfAttack } from "./PlanOfAttack.ts"

const { Self, Ally, Foe } = Targets

function create(recipe: string) {
	const random = new Random(1)
	const unit = UnitFactory.create(recipe, 10, { notifications: new NotificationCenter(), random })!
	return { unit, random }
}

/** What the unit's attack pattern picks for its next `turns` turns: [ability, target]. */
function picks(unit: Unit, turns: number) {
	return Array.from({ length: turns }, () => {
		const plan = new PlanOfAttack()
		unit.attackPattern!.pick(plan)
		return [plan.ability?.name, plan.target]
	})
}

describe("Driver", () => {
	test("the special driver, if any, overrides the normal one", () => {
		const driver = new Driver()
		expect(driver.current).toBe(Drivers.None)
		driver.normal = Drivers.Computer
		expect(driver.current).toBe(Drivers.Computer)
		driver.special = Drivers.Human
		expect(driver.current).toBe(Drivers.Human)
	})
})

describe("AttackPattern", () => {
	test("the enemy warrior's: Attack, then Attack or First Aid (on itself), then Earth Render", () => {
		const { unit, random } = create("Enemy Warrior")
		const int = vi.spyOn(random, "int").mockReturnValueOnce(1).mockReturnValueOnce(0)
		expect(picks(unit, 6)).toEqual([
			["Attack", Foe],
			["First Aid", Self],
			["Earth Render", Foe],
			["Attack", Foe],
			["Attack", Foe],
			["Earth Render", Foe]
		])
		expect(int.mock.calls).toEqual([
			[0, 2],
			[0, 2]
		])
	})

	test("a name its catalog doesn't have: the unit's attack, on a foe", () => {
		const { unit } = create("Enemy Warrior")
		const plan = new PlanOfAttack()
		unit.attackPattern!.pick(plan)
		expect(plan.ability).toBe(unit.attack)
	})

	test("the enemy wizard's: Water, Water or Prominence, then Cure on an ally", () => {
		const { unit, random } = create("Enemy Wizard")
		vi.spyOn(random, "int").mockReturnValueOnce(1)
		expect(picks(unit, 4)).toEqual([
			["Water", Foe],
			["Prominence", Foe],
			["Cure", Ally],
			["Water", Foe]
		])
	})

	test("the enemy rogue's: Attack, Blind or Drain, Air Blast", () => {
		const { unit, random } = create("Enemy Rogue")
		vi.spyOn(random, "int").mockReturnValueOnce(1).mockReturnValueOnce(0)
		expect(picks(unit, 6)).toEqual([
			["Attack", Foe],
			["Drain", Foe],
			["Air Blast", Foe],
			["Attack", Foe],
			["Blind", Foe],
			["Air Blast", Foe]
		])
	})

	test("a picker that isn't in the prefab", () => {
		const { unit, random } = create("Enemy Warrior")
		const prefab: AttackPatternPrefab = { name: "Broken", pickers: ["Nothing"], children: [] }
		expect(() => instantiateAttackPattern(prefab, unit, { random })).toThrow(
			"No ability picker Nothing in Broken"
		)
	})
})
