import type { SpriteName } from "#lib/assets/textures/ui/sprites.ts"
import { Panel, type PanelPosition } from "#lib/common/ui/Panel.ts"
import type { SpeakerData } from "#lib/model/SpeakerData.ts"

/**
 * Port of `View Model Component/ConversationPanel.cs`: one speech panel (portrait, message and a
 * "more" arrow) that steps through a speaker's messages. Rendered by `<ConversationPanelView>`,
 * which also plays the arrow's bounce (Unity's `Start`).
 */
export class ConversationPanel {
	message = $state("")
	speaker: SpriteName = $state("Avatar")
	/** Whether the "more" arrow shows (`arrow.activeSelf`). */
	arrow = $state(true)
	readonly panel: Panel

	constructor(positionList: readonly PanelPosition[]) {
		this.panel = new Panel(positionList)
	}

	/** Shows each message in turn; advanced manually, one message per `next()`. */
	*display(sd: SpeakerData): Generator<void, void, void> {
		// (`SetNativeSize`: the view sizes the portrait from its sprite.)
		this.speaker = sd.speaker

		for (let i = 0; i < sd.messages.length; ++i) {
			this.message = sd.messages[i]!
			this.arrow = i + 1 < sd.messages.length
			yield
		}
	}
}
