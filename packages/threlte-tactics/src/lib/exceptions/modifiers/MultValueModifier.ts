import { ValueModifier } from "./ValueModifier.ts"

/** Port of `Exceptions/Modifiers/MultValueModifier.cs`. */
export class MultValueModifier extends ValueModifier {
	readonly toMultiply: number

	constructor(sortOrder: number, toMultiply: number) {
		super(sortOrder)
		this.toMultiply = toMultiply
	}

	modify(_fromValue: number, toValue: number): number {
		return toValue * this.toMultiply
	}
}
