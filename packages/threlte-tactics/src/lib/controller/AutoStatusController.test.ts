import { describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Turn } from "#lib/model/Turn.ts"
import { Health } from "#lib/view-model-component/actor/Health.ts"
import { StatComparisonCondition } from "#lib/view-model-component/status/conditions/StatComparisonCondition.ts"
import { KnockOutStatusEffect } from "#lib/view-model-component/status/effects/KnockOutStatusEffect.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { AutoStatusController } from "./AutoStatusController.ts"
import { TurnOrderController } from "./TurnOrderController.ts"

const { HP, MHP, CTR, SPD } = StatTypes

/** Lets the current code finish: removed effects are disabled by then. */
const endOfFrame = () => new Promise<void>((resolve) => queueMicrotask(resolve))

/** Units with 100 max HP (and full), 100 speed, `Health`, and an auto status controller. */
function setup(count = 1) {
	const notifications = new NotificationCenter()
	const units = Array.from({ length: count }, (_, i) => {
		const unit = new Unit({ name: `Unit ${i}`, model: "Hero", notifications })
		unit.stats.set(MHP, 100)
		unit.stats.set(HP, 100)
		unit.stats.set(SPD, 100)
		unit.health = new Health(unit.stats, notifications)
		return unit
	})
	const controller = new AutoStatusController(notifications)
	const ko = (unit: Unit) => unit.status.getEffect(KnockOutStatusEffect)
	return { notifications, units, unit: units[0]!, controller, ko }
}

describe("AutoStatusController and KnockOutStatusEffect", () => {
	test("a unit whose HP drop to 0 is knocked out, while they stay at 0", () => {
		const { unit, ko } = setup()
		unit.stats.set(HP, 1)
		expect(ko(unit)).toBeNull()

		unit.stats.set(HP, 0)
		expect(ko(unit)).toBeInstanceOf(KnockOutStatusEffect)
		const [condition] = unit.status.getConditions(StatComparisonCondition)
		expect([condition?.type, condition?.value, condition?.condition]).toEqual([
			HP,
			0,
			condition?.equalTo
		])
	})

	test("is squashed flat until revived (once the current code finishes)", async () => {
		const { unit, ko } = setup()
		unit.stats.set(HP, 0)
		expect(unit.transform.scale).toEqual([0.75, 0.1, 0.75])

		unit.stats.set(HP, 25)
		expect(ko(unit)).toBeNull()
		expect(unit.status.getConditions(StatComparisonCondition)).toEqual([])
		expect(unit.transform.scale).toEqual([0.75, 0.1, 0.75])
		await endOfFrame()
		expect(unit.transform.scale).toEqual([1, 1, 1])
	})

	test("its counter can't grow, though it can drop", () => {
		const { unit } = setup()
		unit.stats.set(CTR, 600)
		unit.stats.set(HP, 0)
		unit.stats.set(CTR, 700)
		expect(unit.stats.get(CTR)).toBe(600)
		unit.stats.set(CTR, 100)
		expect(unit.stats.get(CTR)).toBe(100)
	})

	test("the turn order skips it, even with the counter for a turn", () => {
		const { notifications, units } = setup(2)
		const [fast, slow] = units as [Unit, Unit]
		fast.stats.set(SPD, 200)
		fast.stats.set(CTR, 2000)
		fast.stats.set(HP, 0)
		const owner = { notifications, turn: new Turn(), units }
		const round = new TurnOrderController(owner).round()
		expect(round.next().value).toBe(slow)
		expect(fast.stats.get(CTR)).toBe(2000)
	})

	test("a unit that couldn't take a turn anyway still can't", () => {
		const { notifications, unit } = setup()
		unit.stats.set(HP, 0)
		const exc = { defaultToggle: false, toggle: false, flipToggle: () => (exc.toggle = true) }
		notifications.postNotification(TurnOrderController.turnCheckNotification, unit, exc as never)
		expect(exc.toggle).toBe(false)
	})

	test("not when its health keeps it above 0", () => {
		const { unit, ko } = setup()
		unit.health!.minHP = 10
		unit.stats.set(HP, 0)
		expect([unit.stats.get(HP), ko(unit)]).toEqual([10, null])
	})

	test("disabled, it knocks no one out", () => {
		const { unit, controller, ko } = setup()
		controller.disable()
		unit.stats.set(HP, 0)
		expect(ko(unit)).toBeNull()
	})
})

describe("StatComparisonCondition", () => {
	test("compares its stat with its value", () => {
		const { unit } = setup()
		const c = unit.status.add(KnockOutStatusEffect, StatComparisonCondition)
		c.init(HP, 100, null)
		expect([c.equalTo(), c.lessThan(), c.lessThanOrEqualTo()]).toEqual([true, false, true])
		expect([c.greaterThan(), c.greaterThanOrEqualTo()]).toEqual([false, true])
		unit.stats.set(HP, 50)
		expect([c.lessThan(), c.greaterThan()]).toEqual([true, false])
		// No condition: it stays.
		expect(unit.status.has(c)).toBe(true)
	})

	test("removes itself once its condition stops holding", () => {
		const { unit } = setup()
		const c = unit.status.add(KnockOutStatusEffect, StatComparisonCondition)
		c.init(HP, 50, c.greaterThan)
		unit.stats.set(HP, 60)
		expect(unit.status.has(c)).toBe(true)
		unit.stats.set(HP, 50)
		expect(unit.status.has(c)).toBe(false)
	})
})
