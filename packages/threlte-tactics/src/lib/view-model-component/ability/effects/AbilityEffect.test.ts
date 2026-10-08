import { describe, expect, test, vi } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/unity/Random.ts"
import { Resources } from "#lib/common/unity/Resources.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { EquipSlots } from "#lib/enums/EquipSlots.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { MultValueModifier } from "#lib/exceptions/modifiers/MultValueModifier.ts"
import { Point } from "#lib/model/Point.ts"
import { board } from "#lib/testing/board.ts"
import { Ability, type AbilityEffect } from "#lib/view-model-component/ability/Ability.ts"
import { UnitAbilityArea } from "#lib/view-model-component/ability/area-of-effect/UnitAbilityArea.ts"
import { DefaultAbilityEffectTarget } from "#lib/view-model-component/ability/effect-target/DefaultAbilityEffectTarget.ts"
import { ATypeHitRate } from "#lib/view-model-component/ability/hit-rate/ATypeHitRate.ts"
import { FullTypeHitRate } from "#lib/view-model-component/ability/hit-rate/FullTypeHitRate.ts"
import type { BaseAbilityPower } from "#lib/view-model-component/ability/power/BaseAbilityPower.ts"
import { MagicalAbilityPower } from "#lib/view-model-component/ability/power/MagicalAbilityPower.ts"
import { PhysicalAbilityPower } from "#lib/view-model-component/ability/power/PhysicalAbilityPower.ts"
import { WeaponAbilityPower } from "#lib/view-model-component/ability/power/WeaponAbilityPower.ts"
import { ConstantAbilityRange } from "#lib/view-model-component/ability/range/ConstantAbilityRange.ts"
import { Job, type JobPrefab } from "#lib/view-model-component/actor/Job.ts"
import { StatModifierFeature } from "#lib/view-model-component/features/StatModifierFeature.ts"
import { Equippable } from "#lib/view-model-component/item/Equippable.ts"
import { BlindStatusEffect } from "#lib/view-model-component/status/effects/BlindStatusEffect.ts"
import { DurationStatusCondition } from "#lib/view-model-component/status/conditions/DurationStatusCondition.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { BaseAbilityEffect } from "./BaseAbilityEffect.ts"
import { DamageAbilityEffect } from "./DamageAbilityEffect.ts"
import { InflictAbilityEffect } from "./InflictAbilityEffect.ts"

const { HP, MHP, ATK, DEF, MAT, MDF } = StatTypes

/**
 * An attacker at (0, 0) and a defender at (1, 0) with 100 HP and these stats (no evade), and
 * helpers to build the attacker's abilities.
 */
function setup(attackerStats: Partial<Record<StatTypes, number>> = {}, defenderStats = {}) {
	const notifications = new NotificationCenter()
	const random = new Random(1)
	const context = { notifications, random }
	const b = board("00")
	const unit = (name: string, x: number, stats: Partial<Record<StatTypes, number>>) => {
		const u = new Unit({ name, model: "Hero", notifications })
		u.place(b.getTile(Point.of(x, 0)))
		u.stats.set(MHP, 100)
		u.stats.set(HP, 100)
		for (const [type, value] of Object.entries(stats)) u.stats.set(Number(type) as StatTypes, value)
		return u
	}
	const attacker = unit("Attacker", 0, attackerStats)
	const defender = unit("Defender", 1, defenderStats)
	const target = defender.tile!
	/** An ability of the attacker's with this power and these children. */
	const ability = (power: BaseAbilityPower | null, ...effects: AbilityEffect[]) =>
		new Ability({
			name: "Ability",
			power,
			range: new ConstantAbilityRange(attacker),
			area: new UnitAbilityArea(),
			effects
		})
	/** A child that always hits a unit with HP left. */
	const child = (effect: BaseAbilityEffect): AbilityEffect => ({
		name: effect.constructor.name,
		hitRate: new FullTypeHitRate(attacker, context),
		target: new DefaultAbilityEffectTarget(),
		effect
	})
	const damage = () => new DamageAbilityEffect(attacker, context)
	const physical = (level: number) => new PhysicalAbilityPower(attacker, context, { level })
	return {
		notifications,
		random,
		context,
		attacker,
		defender,
		target,
		ability,
		child,
		damage,
		physical
	}
}

describe("DamageAbilityEffect", () => {
	test("predicts attack minus half the defense, at the power's percentage, as a loss", () => {
		const { target, ability, child, damage, physical } = setup({ [ATK]: 100 }, { [DEF]: 61 })
		const effect = damage()
		ability(physical(45), child(effect))
		// (100 - 61 / 2) * 45 / 100, in whole numbers.
		expect(effect.predict(target)).toBe(-31)
	})

	test("does at least 1 damage, before and after the power", () => {
		const { target, ability, child, damage, physical } = setup({ [ATK]: 10 }, { [DEF]: 100 })
		const effect = damage()
		ability(physical(45), child(effect))
		expect(effect.predict(target)).toBe(-1)

		const powerless = damage()
		ability(null, child(powerless))
		expect(powerless.predict(target)).toBe(-1)
	})

	test("a magical power uses magic attack and magic defense", () => {
		const { context, attacker, target, ability, child, damage } = setup(
			{ [ATK]: 1, [MAT]: 120 },
			{ [DEF]: 1, [MDF]: 40 }
		)
		const effect = damage()
		ability(new MagicalAbilityPower(attacker, context, { level: 50 }), child(effect))
		expect(effect.predict(target)).toBe(-50)
	})

	test("a power only powers its own ability's effects", () => {
		const { target, ability, child, damage, physical } = setup({ [ATK]: 100 })
		const [weak, strong] = [damage(), damage()]
		ability(physical(10), child(weak))
		ability(physical(100), child(strong))
		expect([weak.predict(target), strong.predict(target)]).toEqual([-10, -100])
	})

	test("observers can tweak the damage", () => {
		const { notifications, target, ability, child, damage, physical } = setup({ [ATK]: 100 })
		const effect = damage()
		ability(physical(45), child(effect))
		notifications.addObserver((sender, info) => {
			expect(sender).toBe(effect)
			info.arg2.push(new MultValueModifier(0, 1.5))
		}, BaseAbilityEffect.tweakDamageNotification)
		expect(effect.predict(target)).toBe(-67)
	})

	test("applies the prediction with ±10% variance, and posts how much it changed HP by", () => {
		const { notifications, random, defender, target, ability, child, damage, physical } = setup({
			[ATK]: 100
		})
		const effect = damage()
		ability(physical(45), child(effect))
		const hit = vi.fn()
		notifications.addObserver(hit, BaseAbilityEffect.hitNotification, effect)
		const variance = vi.spyOn(random, "rangeFloat").mockReturnValue(0.9)

		effect.apply(target)
		expect(variance).toHaveBeenCalledWith(0.9, 1.1)
		// -45 * 0.9 = -40.5, floored.
		expect(defender.stats.get(HP)).toBe(100 - 41)
		expect(hit.mock.calls).toEqual([[effect, -41]])

		variance.mockReturnValue(1.1)
		effect.apply(target)
		expect(defender.stats.get(HP)).toBe(59 - 50)
	})
})

describe("BaseAbilityEffect.apply", () => {
	test("rolls for a hit on a target, and posts whether it missed", () => {
		const { notifications, random, context, attacker, defender, target, ability, damage } = setup(
			{ [ATK]: 100 },
			{ [StatTypes.EVD]: 50 }
		)
		// Facing the attacker: all 50 evade counts.
		defender.dir = Directions.West
		const effect = damage()
		ability(null, {
			name: "Damage",
			hitRate: new ATypeHitRate(attacker, context),
			target: new DefaultAbilityEffectTarget(),
			effect
		})
		const missed = vi.fn()
		notifications.addObserver(missed, BaseAbilityEffect.missedNotification, effect)
		vi.spyOn(random, "rangeFloat").mockReturnValue(1)
		const roll = vi.spyOn(random, "rangeInt").mockReturnValue(51)

		effect.apply(target)
		expect(missed).toHaveBeenCalledOnce()
		expect(defender.stats.get(HP)).toBe(100)

		roll.mockReturnValue(50)
		effect.apply(target)
		expect(defender.stats.get(HP)).toBe(99)

		// Not a target: no roll.
		defender.stats.set(HP, 0)
		roll.mockClear()
		effect.apply(target)
		expect(roll).not.toHaveBeenCalled()
		expect(missed).toHaveBeenCalledOnce()
	})
})

describe("InflictAbilityEffect", () => {
	test("puts the named status on the target for its duration", () => {
		const { context, attacker, defender, target, ability, child } = setup()
		const effect = new InflictAbilityEffect(attacker, context, {
			statusName: "BlindStatusEffect",
			duration: 10
		})
		ability(null, child(effect))
		expect(effect.predict(target)).toBe(0)

		effect.apply(target)
		expect(defender.status.getEffect(BlindStatusEffect)).not.toBeNull()
		const [condition] = defender.status.getConditions(DurationStatusCondition)
		expect(condition!.duration).toBe(10)
	})

	test("logs an error for a name that isn't a status effect", () => {
		const { context, attacker, target, ability, child } = setup()
		const error = vi.spyOn(console, "error").mockImplementation(() => {})
		for (const statusName of ["Bogus", "toString", "StatusEffect"]) {
			const effect = new InflictAbilityEffect(attacker, context, { statusName, duration: 1 })
			ability(null, child(effect))
			effect.apply(target)
		}
		expect(error.mock.calls).toEqual([
			["Invalid Status Type"],
			["Invalid Status Type"],
			["Invalid Status Type"]
		])
		error.mockRestore()
	})
})

describe("WeaponAbilityPower", () => {
	function armed() {
		const s = setup({ [ATK]: 100 })
		const { notifications, random, attacker, ability, child, damage } = s
		const job = new Job(Resources.load<JobPrefab>("Jobs/Warrior")!, { notifications, random })
		attacker.job = job
		const effect = damage()
		ability(new WeaponAbilityPower(attacker, s.context), child(effect))
		return { ...s, effect }
	}

	test("unarmed, powers with the job's starting attack", () => {
		const { effect, target } = armed()
		// The Warrior starts with 61 attack.
		expect(effect.predict(target)).toBe(-61)
	})

	test("armed, powers with the weapon's attack bonus", () => {
		const { attacker, effect, target } = armed()
		const sword = new Equippable(
			[
				new StatModifierFeature(ATK, 30),
				new StatModifierFeature(DEF, 5),
				new StatModifierFeature(ATK, 10)
			],
			{ defaultSlots: EquipSlots.Primary }
		)
		attacker.equipment.equip(sword, EquipSlots.Primary)
		// Equipping it added 40 attack too.
		expect(effect.predict(target)).toBe(-Math.trunc((40 * 140) / 100))
	})
})
