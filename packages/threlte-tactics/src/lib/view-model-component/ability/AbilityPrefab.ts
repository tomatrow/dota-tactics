import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import type { Random } from "#lib/common/Random.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { Ability, type AbilityEffect } from "./Ability.ts"
import { AbilityMagicCost } from "./AbilityMagicCost.ts"
import type { AbilityArea } from "./area-of-effect/AbilityArea.ts"
import { FullAbilityArea } from "./area-of-effect/FullAbilityArea.ts"
import { SpecifyAbilityArea } from "./area-of-effect/SpecifyAbilityArea.ts"
import { UnitAbilityArea } from "./area-of-effect/UnitAbilityArea.ts"
import { AbsorbDamageAbilityEffectTarget } from "./effect-target/AbsorbDamageAbilityEffectTarget.ts"
import type { AbilityEffectTarget } from "./effect-target/AbilityEffectTarget.ts"
import { DefaultAbilityEffectTarget } from "./effect-target/DefaultAbilityEffectTarget.ts"
import { EnemyAbilityEffectTarget } from "./effect-target/EnemyAbilityEffectTarget.ts"
import { KOdAbilityEffectTarget } from "./effect-target/KOdAbilityEffectTarget.ts"
import { UndeadAbilityEffectTarget } from "./effect-target/UndeadAbilityEffectTarget.ts"
import type { BaseAbilityEffect } from "./effects/BaseAbilityEffect.ts"
import { DamageAbilityEffect } from "./effects/DamageAbilityEffect.ts"
import { EsunaAbilityEffect } from "./effects/EsunaAbilityEffect.ts"
import { HealAbilityEffect } from "./effects/HealAbilityEffect.ts"
import { InflictAbilityEffect } from "./effects/InflictAbilityEffect.ts"
import { ReviveAbilityEffect } from "./effects/ReviveAbilityEffect.ts"
import { ATypeHitRate } from "./hit-rate/ATypeHitRate.ts"
import { FullTypeHitRate } from "./hit-rate/FullTypeHitRate.ts"
import type { HitRate } from "./hit-rate/HitRate.ts"
import { STypeHitRate } from "./hit-rate/STypeHitRate.ts"
import type { BaseAbilityPower } from "./power/BaseAbilityPower.ts"
import { MagicalAbilityPower } from "./power/MagicalAbilityPower.ts"
import { PhysicalAbilityPower } from "./power/PhysicalAbilityPower.ts"
import { WeaponAbilityPower } from "./power/WeaponAbilityPower.ts"
import type { AbilityRange } from "./range/AbilityRange.ts"
import { ConeAbilityRange } from "./range/ConeAbilityRange.ts"
import { ConstantAbilityRange } from "./range/ConstantAbilityRange.ts"
import { InfiniteAbilityRange } from "./range/InfiniteAbilityRange.ts"
import { LineAbilityRange } from "./range/LineAbilityRange.ts"
import { SelfAbilityRange } from "./range/SelfAbilityRange.ts"

/** A component as prefab data: its class name and its Inspector fields. */
type Component<T extends string, Fields = object> = { readonly type: T } & Readonly<Fields>

type RangeFields = { horizontal: number; vertical: number }

/** One of an ability prefab's children: an effect, with its hit rate and effect target. */
export interface AbilityEffectPrefab {
	readonly name: string
	readonly hitRate: Component<"ATypeHitRate" | "STypeHitRate" | "FullTypeHitRate">
	readonly target:
		| Component<
				"DefaultAbilityEffectTarget" | "EnemyAbilityEffectTarget" | "KOdAbilityEffectTarget"
		  >
		| Component<"UndeadAbilityEffectTarget", { toggle: boolean }>
	readonly effect:
		| Component<"DamageAbilityEffect" | "EsunaAbilityEffect" | "HealAbilityEffect">
		| Component<"InflictAbilityEffect", { statusName: string; duration: number }>
		| Component<"ReviveAbilityEffect", { percent: number }>
		| Component<"AbsorbDamageAbilityEffectTarget", { trackedSiblingIndex: number }>
}

/** An ability prefab as data: the ability's components, and its children (its effects). */
export interface AbilityPrefab {
	readonly name: string
	readonly power?:
		| Component<"PhysicalAbilityPower" | "MagicalAbilityPower", { level: number }>
		| Component<"WeaponAbilityPower">
	readonly range: Component<
		| "ConeAbilityRange"
		| "ConstantAbilityRange"
		| "InfiniteAbilityRange"
		| "LineAbilityRange"
		| "SelfAbilityRange",
		RangeFields
	>
	readonly area:
		| Component<"FullAbilityArea" | "UnitAbilityArea">
		| Component<"SpecifyAbilityArea", { horizontal: number; vertical: number }>
	/** `AbilityMagicCost.amount`, if it has one. */
	readonly magicCost?: number
	readonly children: readonly AbilityEffectPrefab[]
}

/** What instantiating an ability needs of its battle. */
export interface AbilityPrefabContext {
	readonly notifications: NotificationCenter
	readonly random: Random
}

/** Unity's `Instantiate(prefab)`, parented to `unit`: a new ability for the unit. */
export function instantiateAbility(
	prefab: AbilityPrefab,
	unit: Unit,
	context: AbilityPrefabContext
): Ability {
	const range = createRange(prefab.range, unit)
	return new Ability(
		{
			name: prefab.name,
			power: prefab.power ? createPower(prefab.power, unit, context) : null,
			range,
			area: createArea(prefab.area, range),
			magicCost:
				prefab.magicCost !== undefined ?
					new AbilityMagicCost(unit, context, { amount: prefab.magicCost })
				:	null,
			effects: prefab.children.map((child) => createChild(child, unit, context))
		},
		context
	)
}

function createPower(
	power: NonNullable<AbilityPrefab["power"]>,
	unit: Unit,
	context: AbilityPrefabContext
): BaseAbilityPower {
	switch (power.type) {
		case "PhysicalAbilityPower":
			return new PhysicalAbilityPower(unit, context, power)
		case "MagicalAbilityPower":
			return new MagicalAbilityPower(unit, context, power)
		case "WeaponAbilityPower":
			return new WeaponAbilityPower(unit, context)
	}
}

function createRange(range: AbilityPrefab["range"], unit: Unit): AbilityRange {
	const types = {
		ConeAbilityRange,
		ConstantAbilityRange,
		InfiniteAbilityRange,
		LineAbilityRange,
		SelfAbilityRange
	}
	return new types[range.type](unit, range)
}

function createArea(area: AbilityPrefab["area"], range: AbilityRange): AbilityArea {
	switch (area.type) {
		case "FullAbilityArea":
			return new FullAbilityArea(range)
		case "UnitAbilityArea":
			return new UnitAbilityArea()
		case "SpecifyAbilityArea":
			return new SpecifyAbilityArea(area)
	}
}

function createChild(
	child: AbilityEffectPrefab,
	unit: Unit,
	context: AbilityPrefabContext
): AbilityEffect {
	return {
		name: child.name,
		hitRate: createHitRate(child.hitRate, unit, context),
		target: createTarget(child.target, unit),
		effect: createEffect(child.effect, unit, context)
	}
}

function createHitRate(
	hitRate: AbilityEffectPrefab["hitRate"],
	unit: Unit,
	context: AbilityPrefabContext
): HitRate {
	const types = { ATypeHitRate, STypeHitRate, FullTypeHitRate }
	return new types[hitRate.type](unit, context)
}

function createTarget(target: AbilityEffectPrefab["target"], unit: Unit): AbilityEffectTarget {
	switch (target.type) {
		case "DefaultAbilityEffectTarget":
			return new DefaultAbilityEffectTarget()
		case "EnemyAbilityEffectTarget":
			return new EnemyAbilityEffectTarget(unit)
		case "KOdAbilityEffectTarget":
			return new KOdAbilityEffectTarget()
		case "UndeadAbilityEffectTarget":
			return new UndeadAbilityEffectTarget(target)
	}
}

function createEffect(
	effect: AbilityEffectPrefab["effect"],
	unit: Unit,
	context: AbilityPrefabContext
): BaseAbilityEffect {
	switch (effect.type) {
		case "DamageAbilityEffect":
			return new DamageAbilityEffect(unit, context)
		case "EsunaAbilityEffect":
			return new EsunaAbilityEffect(unit, context)
		case "HealAbilityEffect":
			return new HealAbilityEffect(unit, context)
		case "InflictAbilityEffect":
			return new InflictAbilityEffect(unit, context, effect)
		case "ReviveAbilityEffect":
			return new ReviveAbilityEffect(unit, context, effect)
		case "AbsorbDamageAbilityEffectTarget":
			return new AbsorbDamageAbilityEffectTarget(unit, context, effect)
	}
}
