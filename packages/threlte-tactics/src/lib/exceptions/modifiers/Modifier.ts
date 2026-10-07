/** Port of `Exceptions/Modifiers/Modifier.cs`: modifiers apply in ascending `sortOrder`. */
export abstract class Modifier {
	readonly sortOrder: number

	constructor(sortOrder: number) {
		this.sortOrder = sortOrder
	}
}
