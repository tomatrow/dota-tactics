import type { AbilityArea } from "./area-of-effect/AbilityArea.ts"
import type { AbilityEffectTarget } from "./effect-target/AbilityEffectTarget.ts"
import type { AbilityRange } from "./range/AbilityRange.ts"

/** One of an ability's child GameObjects: an effect of the ability, and whom it applies to. */
// TODO(part 18): its hit rate. TODO(part 19): the effect.
export interface AbilityEffect {
	/** The GameObject's name. */
	readonly name: string
	readonly target: AbilityEffectTarget
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
	readonly range: AbilityRange
	readonly area: AbilityArea
	/** Its child GameObjects, in order. */
	readonly effects: readonly AbilityEffect[]

	constructor({
		name,
		range,
		area,
		effects
	}: {
		name: string
		range: AbilityRange
		area: AbilityArea
		effects: readonly AbilityEffect[]
	}) {
		this.name = name
		this.range = range
		this.area = area
		this.effects = effects
	}
}
