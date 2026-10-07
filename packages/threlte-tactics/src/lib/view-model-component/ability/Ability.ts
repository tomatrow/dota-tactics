import type { AbilityRange } from "./range/AbilityRange.ts"

/**
 * An ability's GameObject: its name and its components (typed fields, Unity's `GetComponent`).
 * Unity's `Turn.ability` is this GameObject until the `Ability` component arrives (part 20); here
 * both are this class.
 */
// TODO(part 15): area of effect and effect targets. TODO(part 20): Unity's `Ability` component.
export class Ability {
	/** The GameObject's name. */
	readonly name: string
	readonly range: AbilityRange

	constructor({ name, range }: { name: string; range: AbilityRange }) {
		this.name = name
		this.range = range
	}
}
