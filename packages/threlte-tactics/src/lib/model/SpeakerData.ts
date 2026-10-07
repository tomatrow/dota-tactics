import type { SpriteName } from "#lib/assets/textures/ui/sprites.ts"
import type { TextAnchor } from "#lib/common/unity/TextAnchor.ts"

/** Port of `Model/SpeakerData.cs`: one character's turn in a conversation. */
export interface SpeakerData {
	/** The pages of text, shown one at a time. */
	messages: string[]
	/** The speaker's portrait. */
	speaker: SpriteName
	/** Which corner of the screen the panel shows in. */
	anchor: TextAnchor
}
