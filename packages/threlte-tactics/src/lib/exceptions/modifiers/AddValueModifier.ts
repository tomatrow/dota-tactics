import { ValueModifier } from "./ValueModifier.ts"

/** Port of `Exceptions/Modifiers/AddValueModifier.cs`. */
export class AddValueModifier extends ValueModifier {
	readonly toAdd: number

	constructor(sortOrder: number, toAdd: number) {
		super(sortOrder)
		this.toAdd = toAdd
	}

	modify(_fromValue: number, toValue: number): number {
		return toValue + this.toAdd
	}
}
