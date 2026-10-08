import type { AbilityArea } from "./area-of-effect/AbilityArea.ts"
import type { AbilityEffectTarget } from "./effect-target/AbilityEffectTarget.ts"
import type { BaseAbilityEffect } from "./effects/BaseAbilityEffect.ts"
import type { HitRate } from "./hit-rate/HitRate.ts"
import type { BaseAbilityPower } from "./power/BaseAbilityPower.ts"
import type { AbilityRange } from "./range/AbilityRange.ts"

/**
 * One of an ability's child GameObjects: an effect of the ability, whom it applies to, and its
 * chance to.
 */
export interface AbilityEffect {
	/** The GameObject's name. */
	readonly name: string
	readonly hitRate: HitRate
	readonly target: AbilityEffectTarget
	readonly effect: BaseAbilityEffect
}

/**
 * An ability's GameObject: its name and its components (typed fields, Unity's `GetComponent`).
 * Unity's `Turn.ability` is this GameObject until the `Ability` component arrives (part 20); here
 * both are this class.
 */
// TODO(part 20): Unity's `Ability` component.
export class Ability {
	/** The GameObject's name. */
	readonly name: string
	readonly power: BaseAbilityPower | null
	readonly range: AbilityRange
	readonly area: AbilityArea
	/** Its child GameObjects, in order. */
	readonly effects: readonly AbilityEffect[]

	constructor({
		name,
		power = null,
		range,
		area,
		effects
	}: {
		name: string
		power?: BaseAbilityPower | null
		range: AbilityRange
		area: AbilityArea
		effects: readonly AbilityEffect[]
	}) {
		this.name = name
		this.power = power
		this.range = range
		this.area = area
		this.effects = effects

		// Unity's `Instantiate`: the components wake up once the hierarchy is complete.
		power?.attach(this)
		for (const child of effects) child.effect.attach(this, child)
	}
}
