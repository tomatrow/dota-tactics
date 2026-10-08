/** Port of `Enums/Locomotions.cs`: the kind of `Movement` a unit recipe gives its unit. */
export const Locomotions = {
	Walk: 0,
	Fly: 1,
	Teleport: 2
} as const

export type Locomotions = (typeof Locomotions)[keyof typeof Locomotions]
