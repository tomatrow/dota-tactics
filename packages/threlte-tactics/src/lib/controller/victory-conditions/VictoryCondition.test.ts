import { describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Alliances } from "#lib/enums/Alliances.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Alliance } from "#lib/view-model-component/actor/Alliance.ts"
import { Health } from "#lib/view-model-component/actor/Health.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { DefeatAllEnemiesVictoryCondition } from "./DefeatAllEnemiesVictoryCondition.ts"
import { DefeatTargetVictoryCondition } from "./DefeatTargetVictoryCondition.ts"

const { HP, MHP } = StatTypes
const { None, Hero, Enemy, Neutral } = Alliances

/** Two heroes, two enemies and a neutral unit, all with 100 HP. */
function setup() {
	const notifications = new NotificationCenter()
	const unit = (alliance: Alliances | null, health = true) => {
		const u = new Unit({ name: "Unit", model: "Hero", notifications })
		u.stats.set(MHP, 100)
		u.stats.set(HP, 100)
		if (health) u.health = new Health(u.stats, notifications)
		if (alliance !== null) u.alliance = new Alliance(alliance)
		return u
	}
	const heroes = [unit(Hero), unit(Hero)]
	const enemies = [unit(Enemy), unit(Enemy)]
	const neutral = unit(Neutral)
	const bc = { notifications, units: [...heroes, ...enemies, neutral] }
	const defeat = (...units: Unit[]) => {
		for (const u of units) u.stats.set(HP, 0)
	}
	return { notifications, bc, unit, heroes, enemies, neutral, defeat }
}

describe("DefeatAllEnemiesVictoryCondition", () => {
	test("the heroes win once every enemy is defeated", () => {
		const { bc, enemies, defeat } = setup()
		const vc = new DefeatAllEnemiesVictoryCondition(bc)
		expect(vc.victor).toBe(None)
		defeat(enemies[0]!)
		expect(vc.victor).toBe(None)
		defeat(enemies[1]!)
		expect(vc.victor).toBe(Hero)
	})

	test("the enemies win once every hero is defeated; once decided, that stands", () => {
		const { bc, heroes, enemies, defeat } = setup()
		const vc = new DefeatAllEnemiesVictoryCondition(bc)
		defeat(enemies[0]!, heroes[0]!)
		expect(vc.victor).toBe(None)
		defeat(heroes[1]!)
		expect(vc.victor).toBe(Enemy)
		// Decided: it only ever gets checked again.
		defeat(enemies[1]!)
		expect(vc.victor).toBe(Enemy)
	})

	test("defeated is down to the unit's minimum HP; units with no alliance don't count", () => {
		const { bc, unit, enemies, defeat } = setup()
		enemies[1]!.health!.minHP = 10
		bc.units.push(unit(null))
		const vc = new DefeatAllEnemiesVictoryCondition(bc)
		defeat(...enemies)
		expect(enemies[1]!.stats.get(HP)).toBe(10)
		expect(vc.victor).toBe(Hero)
	})

	test("without health, defeated is 0 HP", () => {
		const { notifications, unit } = setup()
		const [hero, enemy] = [unit(Hero), unit(Enemy, false)]
		const vc = new DefeatAllEnemiesVictoryCondition({ notifications, units: [hero, enemy] })
		enemy.stats.set(HP, 1)
		expect(vc.victor).toBe(None)
		enemy.stats.set(HP, 0)
		expect(vc.victor).toBe(Hero)
	})

	test("checks only while enabled", () => {
		const { bc, enemies, defeat } = setup()
		const vc = new DefeatAllEnemiesVictoryCondition(bc)
		vc.disable()
		defeat(...enemies)
		expect(vc.victor).toBe(None)
	})
})

describe("DefeatTargetVictoryCondition", () => {
	test("the heroes win by defeating the target, whoever else is left", () => {
		const { bc, enemies, defeat } = setup()
		const vc = new DefeatTargetVictoryCondition(bc)
		vc.target = enemies[1]!
		vc.target.health!.minHP = 10
		defeat(enemies[0]!)
		expect(vc.victor).toBe(None)
		vc.target.stats.set(HP, 11)
		expect(vc.victor).toBe(None)
		defeat(vc.target)
		expect(vc.victor).toBe(Hero)
	})

	test("the heroes still lose if they're all defeated", () => {
		const { bc, heroes, enemies, defeat } = setup()
		const vc = new DefeatTargetVictoryCondition(bc)
		vc.target = enemies[1]!
		defeat(...heroes)
		expect(vc.victor).toBe(Enemy)
	})
})
