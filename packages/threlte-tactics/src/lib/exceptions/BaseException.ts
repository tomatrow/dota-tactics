/**
 * Port of `Exceptions/BaseException.cs`: posted with a notification so that listeners can make an
 * exception to a rule, by flipping a thing that is normally allowed (or not).
 */
export class BaseException {
	readonly defaultToggle: boolean
	#toggle: boolean

	constructor(defaultToggle: boolean) {
		this.defaultToggle = defaultToggle
		this.#toggle = defaultToggle
	}

	get toggle(): boolean {
		return this.#toggle
	}

	flipToggle(): void {
		this.#toggle = !this.defaultToggle
	}
}
