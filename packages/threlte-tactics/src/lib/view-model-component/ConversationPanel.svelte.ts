import { quadOut } from "svelte/easing"
import type { SpriteName } from "#lib/assets/textures/ui/sprites.ts"
import type { SpeakerData } from "#lib/model/SpeakerData.ts"

/**
 * Port of `View Model Component/ConversationPanel.cs`: one speech panel (portrait, message and a
 * "more" arrow) that steps through a speaker's messages. Rendered by `<ConversationPanelView>`,
 * which slides it in from its side of the screen while `shown`.
 */
export class ConversationPanel {
	/** How it slides in and out (seconds). */
	static readonly transition = { duration: 0.5, easing: quadOut }

	message = $state("")
	speaker: SpriteName = $state("Avatar")
	/** Whether the "more" arrow shows. */
	arrow = $state(true)
	/** Whether it's on screen. */
	shown = $state(false)
	/** The edge of the screen it shows at. */
	edge: "top" | "bottom" = $state("bottom");

	/** Shows each message in turn; advanced manually, one message per `next()`. */
	*display(sd: SpeakerData): Generator<void, void, void> {
		this.speaker = sd.speaker

		for (let i = 0; i < sd.messages.length; ++i) {
			this.message = sd.messages[i]!
			this.arrow = i + 1 < sd.messages.length
			yield
		}
	}
}
