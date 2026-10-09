import { quadOut } from "svelte/easing"
import type { PanelPosition } from "#lib/common/ui/Panel.ts"
import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
import type { ConversationData } from "#lib/model/ConversationData.ts"
import { ConversationPanel } from "#lib/view-model-component/ConversationPanel.svelte.ts"

const ShowTop = "Show Top"
const ShowBottom = "Show Bottom"
const HideTop = "Hide Top"
const HideBottom = "Hide Bottom"

const { UpperLeft, UpperCenter, UpperRight, MiddleLeft, LowerLeft, LowerRight } = TextAnchor
const leftAnchors: readonly TextAnchor[] = [UpperLeft, MiddleLeft, LowerLeft]
const topAnchors: readonly TextAnchor[] = [UpperLeft, UpperCenter, UpperRight]

/** The `Conversation Controller.prefab` panels' position lists. */
const leftPositions: PanelPosition[] = [
	{ name: HideBottom, myAnchor: LowerRight, parentAnchor: LowerLeft, offset: [0, 20] },
	{ name: HideTop, myAnchor: UpperRight, parentAnchor: UpperLeft, offset: [0, -20] },
	{ name: ShowBottom, myAnchor: LowerLeft, parentAnchor: LowerLeft, offset: [0, 20] },
	{ name: ShowTop, myAnchor: UpperLeft, parentAnchor: UpperLeft, offset: [0, -20] }
]
const rightPositions: PanelPosition[] = [
	{ name: HideBottom, myAnchor: LowerLeft, parentAnchor: LowerRight, offset: [0, 20] },
	{ name: HideTop, myAnchor: UpperLeft, parentAnchor: UpperRight, offset: [0, -20] },
	{ name: ShowBottom, myAnchor: LowerRight, parentAnchor: LowerRight, offset: [0, 20] },
	{ name: ShowTop, myAnchor: UpperRight, parentAnchor: UpperRight, offset: [0, -20] }
]

/**
 * Port of `Controller/ConversationController.cs`: plays a conversation in the left and right
 * panels, one message per `next()`. Rendered by `<ConversationControllerView>`.
 */
export class ConversationController {
	readonly leftPanel = new ConversationPanel(leftPositions)
	readonly rightPanel = new ConversationPanel(rightPositions)
	/** Whether the canvas is active (`canvas.gameObject.activeSelf`). */
	canvasActive = $state(true)

	#conversation: Generator<void, void, void> | null = null
	#transition: Promise<void> | null = null
	#complete: (() => void) | null = null

	constructor() {
		if (this.leftPanel.panel.currentPosition === null)
			this.leftPanel.panel.setPosition(HideBottom, false)
		if (this.rightPanel.panel.currentPosition === null)
			this.rightPanel.panel.setPosition(HideBottom, false)
		this.canvasActive = false
	}

	/** Starts a conversation. Resolves when it is over (Unity's `completeEvent`). */
	show(data: ConversationData): Promise<void> {
		this.canvasActive = true
		const { promise, resolve } = Promise.withResolvers<void>()
		this.#complete = resolve
		this.#conversation = this.#sequence(data)
		this.#conversation.next()
		return promise
	}

	/** Advances the conversation, unless a panel is moving. */
	next(): void {
		if (this.#conversation === null || this.#transition !== null) return

		this.#conversation.next()
	}

	*#sequence(data: ConversationData): Generator<void, void, void> {
		for (const sd of data.list) {
			const currentPanel = leftAnchors.includes(sd.anchor) ? this.leftPanel : this.rightPanel
			const presenter = currentPanel.display(sd)
			presenter.next()

			const top = topAnchors.includes(sd.anchor)
			const show = top ? ShowTop : ShowBottom
			const hide = top ? HideTop : HideBottom

			currentPanel.panel.setPosition(hide, false)
			this.#movePanel(currentPanel, show)

			yield
			while (!presenter.next().done) yield

			void this.#movePanel(currentPanel, hide).then(() => this.#conversation?.next())

			yield
		}

		this.canvasActive = false
		this.#complete?.()
	}

	#movePanel(obj: ConversationPanel, pos: string): Promise<void> {
		const transition = obj.panel.setPosition(pos, true, { duration: 0.5, equation: quadOut })
		if (transition === null) throw new Error(`No panel position "${pos}"`)

		// Unity's finished tweener destroys itself, so `transition` reads as null afterwards.
		this.#transition = transition
		void transition.then(() => {
			if (this.#transition === transition) this.#transition = null
		})
		return transition
	}
}
