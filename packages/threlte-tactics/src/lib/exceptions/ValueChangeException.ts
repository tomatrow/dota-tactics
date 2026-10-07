import { BaseException } from "./BaseException.ts"
import type { ValueModifier } from "./modifiers/ValueModifier.ts"

/**
 * Port of `Exceptions/ValueChangeException.cs`: posted before a value changes, so that listeners
 * can block the change (`flipToggle`) or modify the value it changes to.
 */
export class ValueChangeException extends BaseException {
	readonly fromValue: number
	readonly toValue: number
	#modifiers: ValueModifier[] | null = null

	constructor(fromValue: number, toValue: number) {
		super(true)
		this.fromValue = fromValue
		this.toValue = toValue
	}

	get delta(): number {
		return this.toValue - this.fromValue
	}

	addModifier(m: ValueModifier): void {
		this.#modifiers ??= []
		this.#modifiers.push(m)
	}

	/** `toValue`, run through the modifiers in ascending `sortOrder`. */
	getModifiedValue(): number {
		if (this.#modifiers === null) return this.toValue

		let value = this.toValue
		// Array.sort is stable: modifiers with equal sort orders apply in the order they were added.
		this.#modifiers.sort((x, y) => x.sortOrder - y.sortOrder)
		for (const modifier of this.#modifiers) value = modifier.modify(this.fromValue, value)

		return value
	}
}
