import { ValueModifier } from "./ValueModifier.ts"

/** Port of `Exceptions/Modifiers/MaxValueModifier.cs`: the value is at least `max`. */
export class MaxValueModifier extends ValueModifier {
	max: number

	constructor(sortOrder: number, max: number) {
		super(sortOrder)
		this.max = max
	}

	modify(_fromValue: number, toValue: number): number {
		return Math.max(toValue, this.max)
	}
}
