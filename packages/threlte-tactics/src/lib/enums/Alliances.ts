/** Port of `Enums/Alliances.cs`: the side of the battle a unit is on (bit flags, combinable). */
export const Alliances = {
	None: 0,
	Neutral: 1 << 0,
	Hero: 1 << 1,
	Enemy: 1 << 2
} as const

/** One or more alliances (a bit mask), e.g. `Alliances.Hero | Alliances.Neutral`. */
export type Alliances = number
