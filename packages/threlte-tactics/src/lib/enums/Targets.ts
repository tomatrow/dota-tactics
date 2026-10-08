/** Port of `Enums/Targets.cs`: whom something is aimed at, relative to a unit. */
export const Targets = {
	None: 0,
	Self: 1,
	Ally: 2,
	Foe: 3,
	Tile: 4
} as const

export type Targets = (typeof Targets)[keyof typeof Targets]
