import type { SpriteName } from "#lib/assets/textures/ui/sprites.ts"

/**
 * Where on the screen a speaker's panel shows, in the order of `TextAnchor`'s values (which the
 * conversation assets store).
 */
export const anchors = [
	"UpperLeft",
	"UpperCenter",
	"UpperRight",
	"MiddleLeft",
	"MiddleCenter",
	"MiddleRight",
	"LowerLeft",
	"LowerCenter",
	"LowerRight"
] as const

export type Anchor = (typeof anchors)[number]

/** Port of `Model/SpeakerData.cs`: one character's turn in a conversation. */
export interface SpeakerData {
	/** The pages of text, shown one at a time. */
	messages: string[]
	/** The speaker's portrait. */
	speaker: SpriteName
	/** Which corner of the screen the panel shows in. */
	anchor: Anchor
}
