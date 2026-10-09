import { describe, expect, test, vi } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { TurnOrderController } from "#lib/controller/TurnOrderController.ts"
import { EquipSlots } from "#lib/enums/EquipSlots.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Turn } from "#lib/model/Turn.ts"
import { AddPoisonStatusFeature } from "#lib/view-model-component/features/AddPoisonStatusFeature.ts"
import { Equippable } from "#lib/view-model-component/item/Equippable.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { DurationStatusCondition } from "./conditions/DurationStatusCondition.ts"
import { StatusCondition } from "./conditions/StatusCondition.ts"
import { HasteStatusEffect } from "./effects/HasteStatusEffect.ts"
import { PoisonStatusEffect } from "./effects/PoisonStatusEffect.ts"
import { SlowStatusEffect } from "./effects/SlowStatusEffect.ts"
import { StatusEffect, type StatusEffectType } from "./effects/StatusEffect.ts"
import { StopStatusEffect } from "./effects/StopStatusEffect.ts"
import { Status } from "./Status.ts"

const { CTR, HP, MHP, SPD } = StatTypes

/** Lets the current code finish: removed effects and conditions are disabled by then. */
const endOfFrame = () => new Promise<void>((resolve) => queueMicrotask(resolve))

/** Units with these speeds, and a turn order over them. */
function setup(...speeds: number[]) {
	const notifications = new NotificationCenter()
	const units = speeds.map((speed, i) => {
		const unit = new Unit({ name: `Unit ${i}`, model: "Hero", notifications })
		unit.stats.set(SPD, speed)
		unit.stats.set(MHP, 105)
		unit.stats.set(HP, 105)
		return unit
	})
	const turnOrder = new TurnOrderController({ notifications, turn: new Turn(), units })
	const round = turnOrder.round()
	/** Begins the next turn (the frame ends before the turn goes on); whose it is. */
	const next = async () => {
		const unit = round.next().value
		await endOfFrame()
		return units.indexOf(unit)
	}
	/** Plays turns until `unit`'s begins. */
	const turnOf = async (unit: Unit) => {
		while ((await next()) !== units.indexOf(unit));
	}
	const counters = () => units.map((u) => u.stats.get(CTR))
	return { notifications, units, turnOrder, next, turnOf, counters }
}

describe("Status", () => {
	test("an effect lasts while any of its conditions does", () => {
		const { notifications, units } = setup(100)
		const { status } = units[0]!
		const added = vi.fn()
		const removed = vi.fn()
		notifications.addObserver(added, Status.addedNotification, status)
		notifications.addObserver(removed, Status.removedNotification, status)

		const first = status.add(PoisonStatusEffect, StatusCondition)
		const second = status.add(PoisonStatusEffect, DurationStatusCondition)
		const poison = status.getEffect(PoisonStatusEffect)!
		expect(poison).toBeInstanceOf(PoisonStatusEffect)
		expect(status.getEffect(StatusEffect)).toBe(poison)
		expect(status.getEffect(HasteStatusEffect)).toBeNull()
		expect(status.getConditions(StatusCondition)).toEqual([first, second])
		expect(status.getConditions(DurationStatusCondition)).toEqual([second])
		expect(status.getEffectOf(second)).toBe(poison)
		expect(added.mock.calls).toEqual([[status, poison]])

		first.remove()
		expect(status.has(first)).toBe(false)
		expect(status.getEffect(PoisonStatusEffect)).toBe(poison)
		expect(removed).not.toHaveBeenCalled()

		second.remove()
		second.remove()
		expect(status.getEffect(PoisonStatusEffect)).toBeNull()
		expect(removed.mock.calls).toEqual([[status, poison]])
	})

	test("a removed effect works until the current code finishes", async () => {
		const { units } = setup(100)
		const [unit] = units as [Unit]
		const condition = unit.status.add(HasteStatusEffect, StatusCondition)

		condition.remove()
		expect(unit.status.getEffect(HasteStatusEffect)).toBeNull()
		unit.stats.set(CTR, 100)
		expect(unit.stats.get(CTR)).toBe(200)

		await endOfFrame()
		unit.stats.set(CTR, 300)
		expect(unit.stats.get(CTR)).toBe(300)
	})

	test("adding an effect again before the old one is disabled doubles it up", async () => {
		const { units } = setup(100)
		const [unit] = units as [Unit]

		unit.status.add(HasteStatusEffect, StatusCondition).remove()
		unit.status.add(HasteStatusEffect, StatusCondition)
		unit.stats.set(CTR, 100)
		expect(unit.stats.get(CTR)).toBe(400)

		await endOfFrame()
		unit.stats.set(CTR, 500)
		expect(unit.stats.get(CTR)).toBe(600)
	})
})

describe("DurationStatusCondition", () => {
	test("is removed as its last round begins", () => {
		const { notifications, units, turnOrder } = setup(100)
		const [unit] = units as [Unit]
		const condition = unit.status.add(HasteStatusEffect, DurationStatusCondition)
		condition.duration = 3
		const roundBegins = () =>
			notifications.postNotification(TurnOrderController.roundBeganNotification, turnOrder)

		roundBegins()
		roundBegins()
		expect(condition.duration).toBe(1)
		expect(unit.status.has(condition)).toBe(true)
		roundBegins()
		expect(unit.status.has(condition)).toBe(false)
		roundBegins()
		expect(unit.status.getEffect(HasteStatusEffect)).toBeNull()
	})
})

describe("status effects", () => {
	test("haste doubles a unit's counter gains, slow halves them, stop blocks them", () => {
		const { units, counters } = setup(100, 100, 100, 100)
		const [normal, haste, slow, stop] = units as [Unit, Unit, Unit, Unit]
		haste.status.add(HasteStatusEffect, StatusCondition)
		slow.status.add(SlowStatusEffect, StatusCondition)
		stop.status.add(StopStatusEffect, StatusCondition)

		for (const unit of units) unit.stats.set(CTR, 105)
		expect(counters()).toEqual([105, 210, 52, 0])

		// A change that doesn't allow exceptions isn't affected.
		normal.stats.setValue(CTR, 0, false)
		stop.stats.setValue(CTR, 50, false)
		expect(counters()).toEqual([0, 210, 52, 50])
	})

	test("the blog's demo: effects that last 3 rounds, and the rest of their last frame", async () => {
		const { units, next, counters } = setup(100, 100, 100)
		const [haste, slow, stop] = units as [Unit, Unit, Unit]
		const effects: [Unit, StatusEffectType][] = [
			[haste, HasteStatusEffect],
			[slow, SlowStatusEffect],
			[stop, StopStatusEffect]
		]
		for (const [unit, effect] of effects)
			unit.status.add(effect, DurationStatusCondition).duration = 3

		// The effects end as round 3 begins, but work through round 5, where the next turn begins
		// (in the same frame).
		expect(await next()).toBe(0)
		expect(counters()).toEqual([5 * 200, 5 * 50, 0])
		expect(units.map((u) => u.status.getEffect(StatusEffect))).toEqual([null, null, null])

		// Then the counters gain at the normal rate: 5 more rounds to the next turn.
		expect(await next()).toBe(0)
		expect(counters()).toEqual([1000 - 500 + 5 * 100, 5 * 50 + 5 * 100, 5 * 100])
	})

	test("poison takes a tenth of max HP as each of the unit's turns begins", async () => {
		const { units, turnOf } = setup(100, 90)
		const [poisoned, other] = units as [Unit, Unit]
		poisoned.status.add(PoisonStatusEffect, StatusCondition)

		await turnOf(poisoned)
		expect([poisoned.stats.get(HP), other.stats.get(HP)]).toEqual([105 - 10, 105])

		poisoned.stats.set(HP, 4)
		await turnOf(poisoned)
		expect(poisoned.stats.get(HP)).toBe(0)
	})

	test("the blog's cursed sword poisons the unit that wears it", async () => {
		const { units, turnOf } = setup(100)
		const [unit] = units as [Unit]
		const cursedItem = new Equippable([new AddPoisonStatusFeature()], {
			defaultSlots: EquipSlots.Primary
		})

		unit.equipment.equip(cursedItem, EquipSlots.Primary)
		expect(unit.status.getEffect(PoisonStatusEffect)).not.toBeNull()
		await turnOf(unit)
		expect(unit.stats.get(HP)).toBe(95)

		unit.equipment.unEquip(cursedItem)
		expect(unit.status.getEffect(PoisonStatusEffect)).toBeNull()
		await endOfFrame()
		await turnOf(unit)
		expect(unit.stats.get(HP)).toBe(95)
	})
})
