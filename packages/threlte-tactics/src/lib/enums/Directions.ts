/** Port of `Enums/Directions.cs`: the way a unit faces. North is +Z (board +y). */
export const Directions = {
	North: 0,
	East: 1,
	South: 2,
	West: 3
} as const

export type Directions = (typeof Directions)[keyof typeof Directions]
