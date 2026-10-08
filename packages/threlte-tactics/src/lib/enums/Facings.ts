/** Port of `Enums/Facings.cs`: which side of a unit an attack comes from. */
export const Facings = {
	Front: 0,
	Side: 1,
	Back: 2
} as const

export type Facings = (typeof Facings)[keyof typeof Facings]
