import { ValueModifier } from "./ValueModifier.ts"

/** Port of `Exceptions/Modifiers/MultDeltaModifier.cs`: multiplies the change, not the value. */
export class MultDeltaModifier extends ValueModifier {
	readonly toMultiply: number

	constructor(sortOrder: number, toMultiply: number) {
		super(sortOrder)
		this.toMultiply = toMultiply
	}

	modify(fromValue: number, toValue: number): number {
		const delta = toValue - fromValue
		return fromValue + delta * this.toMultiply
	}
}
