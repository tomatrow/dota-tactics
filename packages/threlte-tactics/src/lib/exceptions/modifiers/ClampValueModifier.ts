import { clamp } from "#lib/common/unity/mathf.ts"
import { ValueModifier } from "./ValueModifier.ts"

/** Port of `Exceptions/Modifiers/ClampValueModifier.cs`. */
export class ClampValueModifier extends ValueModifier {
	readonly min: number
	readonly max: number

	constructor(sortOrder: number, min: number, max: number) {
		super(sortOrder)
		this.min = min
		this.max = max
	}

	modify(_fromValue: number, toValue: number): number {
		return clamp(toValue, this.min, this.max)
	}
}
