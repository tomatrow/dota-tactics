/** Port of `Enums/StatTypes.cs`: the stats a `Stats` holds, by index. */
export const StatTypes = {
	/** Level */
	LVL: 0,
	/** Experience */
	EXP: 1,
	/** Hit Points */
	HP: 2,
	/** Max Hit Points */
	MHP: 3,
	/** Magic Points */
	MP: 4,
	/** Max Magic Points */
	MMP: 5,
	/** Physical Attack */
	ATK: 6,
	/** Physical Defense */
	DEF: 7,
	/** Magic Attack */
	MAT: 8,
	/** Magic Defense */
	MDF: 9,
	/** Evade */
	EVD: 10,
	/** Status Resistance */
	RES: 11,
	/** Speed */
	SPD: 12,
	/** Move Range */
	MOV: 13,
	/** Jump Height */
	JMP: 14,
	/** Counter - for turn order */
	CTR: 15,
	/** The number of stat types (not a stat). */
	Count: 16
} as const

/** A stat (`Count` excluded). */
export type StatTypes = Exclude<(typeof StatTypes)[keyof typeof StatTypes], 16>

export type StatTypeName = Exclude<keyof typeof StatTypes, "Count">

/** The name of a stat type: `StatTypeNameOf<typeof StatTypes.HP>` is `"HP"`. */
export type StatTypeNameOf<T extends StatTypes> = {
	[K in StatTypeName]: (typeof StatTypes)[K] extends T ? K : never
}[StatTypeName]

const names = Object.keys(StatTypes) as StatTypeName[]

/** A stat's name, e.g. `"HP"`. */
export function statTypeName<T extends StatTypes>(type: T): StatTypeNameOf<T> {
	return names[type] as StatTypeNameOf<T>
}
