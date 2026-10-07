/** Unity's `TextAnchor`: the nine anchor points of a rect, as `LayoutAnchor` and `Panel` use them. */
export const TextAnchor = {
	UpperLeft: 0,
	UpperCenter: 1,
	UpperRight: 2,
	MiddleLeft: 3,
	MiddleCenter: 4,
	MiddleRight: 5,
	LowerLeft: 6,
	LowerCenter: 7,
	LowerRight: 8
} as const

export type TextAnchor = (typeof TextAnchor)[keyof typeof TextAnchor]
