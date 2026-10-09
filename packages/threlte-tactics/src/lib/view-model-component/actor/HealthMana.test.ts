import { describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { TurnOrderController } from "#lib/controller/TurnOrderController.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { Health } from "./Health.ts"
import { Mana } from "./Mana.ts"

const { HP, MHP, MP, MMP } = StatTypes

function unit() {
	const notifications = new NotificationCenter()
	const u = new Unit({ name: "Unit", model: "Hero", notifications })
	u.stats.set(MHP, 100)
	u.stats.set(HP, 100)
	u.stats.set(MMP, 25)
	u.stats.set(MP, 25)
	u.health = new Health(u.stats, notifications)
	u.mana = new Mana(u, notifications)
	const turnBegins = () =>
		notifications.postNotification(TurnOrderController.turnBeganNotification, u)
	return { notifications, unit: u, stats: u.stats, health: u.health, mana: u.mana, turnBegins }
}

describe("Health", () => {
	test("keeps HP between its minimum and the max", () => {
		const { stats, health } = unit()
		stats.set(HP, 150)
		expect(stats.get(HP)).toBe(100)
		health.hp -= 130
		expect(health.hp).toBe(0)
		health.minHP = 10
		health.hp = 5
		expect(health.hp).toBe(10)
		// Unless the change allows no exceptions.
		stats.setValue(HP, -5, false)
		expect(health.hp).toBe(-5)
	})

	test("a higher max raises HP as much; a lower one clamps it", () => {
		const { stats, health } = unit()
		health.hp = 60
		health.mhp = 120
		expect([stats.get(HP), stats.get(MHP)]).toEqual([80, 120])
		health.mhp = 50
		expect(health.hp).toBe(50)
	})

	test("stops when disabled", () => {
		const { stats, health } = unit()
		health.disable()
		stats.set(HP, 150)
		expect(stats.get(HP)).toBe(150)
	})
})

describe("Mana", () => {
	test("keeps MP between 0 and the max MP", () => {
		const { mana } = unit()
		mana.mp -= 30
		expect(mana.mp).toBe(0)
		mana.mp = 20
		expect(mana.mp).toBe(20)
		mana.mp = 60
		expect(mana.mp).toBe(25)
	})

	test("a higher max raises MP as much; a lower one clamps it", () => {
		const { mana } = unit()
		mana.mp = 10
		mana.mmp = 30
		expect([mana.mp, mana.mmp]).toEqual([15, 30])
		mana.mmp = 12
		expect(mana.mp).toBe(12)
	})

	test("regenerates a tenth of the max (at least 1) as the unit's turn begins", () => {
		const { mana, turnBegins } = unit()
		mana.mp = 0
		turnBegins()
		expect(mana.mp).toBe(2)
		mana.mp = 24
		turnBegins()
		// Clamped to the max MP, not the max HP (`PORTING.md` › Divergences).
		expect(mana.mp).toBe(25)
		turnBegins()
		expect(mana.mp).toBe(25)

		mana.mmp = 5
		mana.mp = 0
		turnBegins()
		expect(mana.mp).toBe(1)
	})
})
