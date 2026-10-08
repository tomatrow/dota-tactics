import { describe, expect, test, vi } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/unity/Random.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Point } from "#lib/model/Point.ts"
import { board } from "#lib/testing/board.ts"
import { Health } from "#lib/view-model-component/actor/Health.ts"
import { Undead } from "#lib/view-model-component/actor/Undead.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { Ability } from "./Ability.ts"
import { AbilityCatalog } from "./AbilityCatalog.ts"
import { instantiateAbility, type AbilityPrefab } from "./AbilityPrefab.ts"
import { AbsorbDamageAbilityEffectTarget } from "./effect-target/AbsorbDamageAbilityEffectTarget.ts"
import { UndeadAbilityEffectTarget } from "./effect-target/UndeadAbilityEffectTarget.ts"
import { BaseAbilityEffect } from "./effects/BaseAbilityEffect.ts"
import { DamageAbilityEffect } from "./effects/DamageAbilityEffect.ts"
import { HealAbilityEffect } from "./effects/HealAbilityEffect.ts"
import { ReviveAbilityEffect } from "./effects/ReviveAbilityEffect.ts"
import { MagicalAbilityPower } from "./power/MagicalAbilityPower.ts"
import { ConstantAbilityRange } from "./range/ConstantAbilityRange.ts"
import { SpecifyAbilityArea } from "./area-of-effect/SpecifyAbilityArea.ts"

const { HP, MHP, MP, MAT, MDF, EVD } = StatTypes
const vertical = 2_147_483_647

/** The final game's Cure, Raise and Drain prefabs. */
const cure: AbilityPrefab = {
	name: "Cure",
	power: { type: "MagicalAbilityPower", level: 40 },
	range: { type: "ConstantAbilityRange", horizontal: 4, vertical },
	area: { type: "SpecifyAbilityArea", horizontal: 1, vertical: 1 },
	magicCost: 6,
	children: [
		{
			name: "Heal",
			hitRate: { type: "FullTypeHitRate" },
			target: { type: "UndeadAbilityEffectTarget", toggle: false },
			effect: { type: "HealAbilityEffect" }
		},
		{
			name: "Damage",
			hitRate: { type: "ATypeHitRate" },
			target: { type: "UndeadAbilityEffectTarget", toggle: true },
			effect: { type: "DamageAbilityEffect" }
		}
	]
}

const raise: AbilityPrefab = {
	...cure,
	name: "Raise",
	power: { type: "PhysicalAbilityPower", level: 45 },
	area: { type: "SpecifyAbilityArea", horizontal: 1, vertical: 2 },
	magicCost: 22,
	children: [
		...cure.children,
		{
			name: "Revive",
			hitRate: { type: "FullTypeHitRate" },
			target: { type: "KOdAbilityEffectTarget" },
			effect: { type: "ReviveAbilityEffect", percent: 0.25 }
		}
	]
}

const drain: AbilityPrefab = {
	name: "Drain",
	power: { type: "MagicalAbilityPower", level: 30 },
	range: { type: "ConstantAbilityRange", horizontal: 4, vertical },
	area: { type: "UnitAbilityArea" },
	magicCost: 12,
	children: [
		{
			name: "Damage",
			hitRate: { type: "ATypeHitRate" },
			target: { type: "DefaultAbilityEffectTarget" },
			effect: { type: "DamageAbilityEffect" }
		},
		{
			name: "Absorb",
			hitRate: { type: "FullTypeHitRate" },
			target: { type: "DefaultAbilityEffectTarget" },
			effect: { type: "AbsorbDamageAbilityEffectTarget", trackedSiblingIndex: 0 }
		}
	]
}

/**
 * A caster at (0, 0) with 100 magic attack and 20 MP, and units at (1, 0) and (2, 0); everyone
 * has 100 max HP (and `Health`), no evade, and no variance in their abilities' effects.
 */
function setup() {
	const notifications = new NotificationCenter()
	const random = new Random(1)
	vi.spyOn(random, "rangeFloat").mockReturnValue(1)
	const context = { notifications, random }
	const b = board("000")
	const unit = (name: string, x: number, hp: number) => {
		const u = new Unit({ name, model: "Hero", notifications })
		u.place(b.getTile(Point.of(x, 0)))
		u.stats.set(MHP, 100)
		u.stats.set(HP, hp)
		u.health = new Health(u.stats, notifications)
		return u
	}
	const caster = unit("Caster", 0, 50)
	caster.stats.set(MAT, 100)
	caster.stats.set(MP, 20)
	const [ally, foe] = [unit("Ally", 1, 50), unit("Foe", 2, 100)]
	const tiles = [caster, ally, foe].map((u) => u.tile!)
	return { notifications, random, context, caster, ally, foe, tiles }
}

describe("Ability", () => {
	test("performs each effect on each target, in order", () => {
		const { context, caster, ally, foe, tiles } = setup()
		const ability = instantiateAbility(cure, caster, context)
		const applied: string[] = []
		for (const child of ability.effects)
			vi.spyOn(child.effect, "apply").mockImplementation((tile) => {
				applied.push(`${child.name} ${tile.content!.name}`)
			})

		ability.perform([ally.tile!, foe.tile!])
		expect(applied).toEqual(["Heal Ally", "Damage Ally", "Heal Foe", "Damage Foe"])
		expect(ability.isTarget(tiles[1]!)).toBe(true)
	})

	test("an MP cost: it can't be performed without the MP, and performing spends them", () => {
		const { notifications, context, caster, ally } = setup()
		const ability = instantiateAbility(raise, caster, context)
		const posted = vi.fn()
		notifications.addObserver(posted, Ability.failedNotification, ability)
		notifications.addObserver(posted, Ability.didPerformNotification, ability)

		expect(ability.canPerform()).toBe(false)
		ability.perform([ally.tile!])
		expect(posted.mock.calls).toEqual([[ability, undefined]])
		expect([ally.stats.get(HP), caster.stats.get(MP)]).toEqual([50, 20])

		caster.stats.set(MP, 30)
		expect(ability.canPerform()).toBe(true)
		ability.perform([ally.tile!])
		expect(caster.stats.get(MP)).toBe(8)
		expect(ally.stats.get(HP)).toBe(95)
	})

	test("another ability's MP cost doesn't block it", () => {
		const { context, caster } = setup()
		const expensive = instantiateAbility(raise, caster, context)
		const cheap = instantiateAbility(cure, caster, context)
		expect([expensive.canPerform(), cheap.canPerform()]).toEqual([false, true])
	})
})

describe("Cure and Raise", () => {
	test("Cure heals by its power; the undead take damage instead", () => {
		const { context, caster, ally, foe } = setup()
		foe.undead = new Undead()
		foe.stats.set(MDF, 40)
		foe.stats.set(EVD, 0)
		const ability = instantiateAbility(cure, caster, context)
		const [heal, damage] = ability.effects
		expect(heal!.effect.predict(ally.tile!)).toBe(40)
		expect([heal!.target.isTarget(foe.tile!), damage!.target.isTarget(foe.tile!)]).toEqual([
			false,
			true
		])
		vi.spyOn(context.random, "rangeInt").mockReturnValue(0)

		ability.perform([ally.tile!, foe.tile!])
		// Healing stops at the max HP. Damage: (100 - 40 / 2) * 40%.
		expect([ally.stats.get(HP), foe.stats.get(HP)]).toEqual([90, 100 - 32])
	})

	test("Raise revives the knocked out to a quarter of their max HP", () => {
		const { context, caster, ally } = setup()
		const ability = instantiateAbility(raise, caster, context)
		ally.stats.set(HP, 0)
		expect(ability.isTarget(ally.tile!)).toBe(true)
		const revive = ability.effects[2]!
		expect(revive.effect).toBeInstanceOf(ReviveAbilityEffect)
		expect(revive.effect.predict(ally.tile!)).toBe(25)

		caster.stats.set(MP, 22)
		ability.perform([ally.tile!])
		// Only Revive applies (the others need HP left).
		expect(ally.stats.get(HP)).toBe(25)
	})
})

describe("Drain", () => {
	function drained() {
		const s = setup()
		const ability = instantiateAbility(drain, s.caster, s.context)
		const roll = vi.spyOn(s.random, "rangeInt").mockReturnValue(0)
		return { ...s, ability, roll }
	}

	test("gives the caster the HP the damage took", () => {
		const { caster, foe, ability } = drained()
		ability.perform([foe.tile!])
		// 100 * 30%.
		expect([foe.stats.get(HP), caster.stats.get(HP), caster.stats.get(MP)]).toEqual([70, 80, 8])
	})

	test("nothing when the damage misses", () => {
		const { caster, foe, ability, roll } = drained()
		foe.stats.set(EVD, 50)
		roll.mockReturnValue(100)
		ability.perform([foe.tile!])
		expect([foe.stats.get(HP), caster.stats.get(HP)]).toEqual([100, 50])
	})

	test("nothing when the damage knocks the target out (it's no longer a target)", () => {
		const { caster, foe, ability } = drained()
		foe.stats.set(HP, 10)
		ability.perform([foe.tile!])
		expect([foe.stats.get(HP), caster.stats.get(HP)]).toEqual([0, 50])
	})

	test("tracks the sibling at its index, or every effect if there's none", () => {
		const { notifications, context, caster, foe } = setup()
		const absorb = new AbsorbDamageAbilityEffectTarget(caster, context, { trackedSiblingIndex: 5 })
		new Ability(
			{
				name: "Absorb",
				range: new ConstantAbilityRange(caster),
				area: new SpecifyAbilityArea(),
				effects: [
					{
						name: "Absorb",
						hitRate: instantiateAbility(drain, caster, context).effects[1]!.hitRate,
						target: new UndeadAbilityEffectTarget(),
						effect: absorb
					}
				]
			},
			context
		)
		const other = new DamageAbilityEffect(caster, context)
		notifications.postNotification(BaseAbilityEffect.hitNotification, other, -7)
		absorb.apply(foe.tile!)
		expect(caster.stats.get(HP)).toBe(57)
	})
})

describe("HealAbilityEffect", () => {
	test("varies by ±10%", () => {
		const { context, caster, ally } = setup()
		const heal = new HealAbilityEffect(caster, context)
		new Ability(
			{
				name: "Heal",
				power: new MagicalAbilityPower(caster, context, { level: 15 }),
				range: new ConstantAbilityRange(caster),
				area: new SpecifyAbilityArea(),
				effects: [{ ...instantiateAbility(cure, caster, context).effects[0]!, effect: heal }]
			},
			context
		)
		vi.mocked(context.random.rangeFloat).mockReturnValue(0.9)
		heal.apply(ally.tile!)
		// 15 * 0.9, floored.
		expect(ally.stats.get(HP)).toBe(63)
	})
})

describe("AbilityCatalog", () => {
	test("abilities by category; out of range is null", () => {
		const { context, caster } = setup()
		const [c, r, d] = [cure, raise, drain].map((p) => instantiateAbility(p, caster, context))
		const catalog = new AbilityCatalog([
			{ name: "White Magic", abilities: [c!, r!] },
			{ name: "Sagacity Skill", abilities: [d!] }
		])
		expect(catalog.categoryCount()).toBe(2)
		expect(catalog.getCategory(1)?.name).toBe("Sagacity Skill")
		expect(catalog.getCategory(2)).toBeNull()
		expect(catalog.abilityCount(catalog.getCategory(0))).toBe(2)
		expect(catalog.abilityCount(null)).toBe(0)
		expect(catalog.getAbility(0, 1)).toBe(r)
		expect([catalog.getAbility(0, 2), catalog.getAbility(-1, 0)]).toEqual([null, null])
	})
})
