import { Modifier } from "./Modifier.ts"

/** Port of `Exceptions/Modifiers/ValueModifier.cs`: changes the value a stat is about to get. */
export abstract class ValueModifier extends Modifier {
	abstract modify(fromValue: number, toValue: number): number
}
