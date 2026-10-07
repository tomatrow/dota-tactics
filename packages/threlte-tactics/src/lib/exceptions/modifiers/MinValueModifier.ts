import { ValueModifier } from "./ValueModifier.ts"

/** Port of `Exceptions/Modifiers/MinValueModifier.cs`: the value is at most `min`. */
export class MinValueModifier extends ValueModifier {
	min: number

	constructor(sortOrder: number, min: number) {
		super(sortOrder)
		this.min = min
	}

	modify(_fromValue: number, toValue: number): number {
		return Math.min(this.min, toValue)
	}
}
