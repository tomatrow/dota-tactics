import { wait } from "#lib/common/time.ts"
import type { ConversationData } from "#lib/model/ConversationData.ts"
import { ConversationPanel } from "#lib/view-model-component/ConversationPanel.svelte.ts"

/**
 * Port of `Controller/ConversationController.cs`: plays a conversation in the left and right
 * panels, one message per `next()`. Rendered by `<ConversationControllerView>`.
 */
export class ConversationController {
	readonly leftPanel = new ConversationPanel()
	readonly rightPanel = new ConversationPanel()

	#conversation: Generator<void, void, void> | null = null
	/** The panel move in progress, if any. */
	#transition: Promise<void> | null = null
	#complete: (() => void) | null = null

	/** Starts a conversation. Resolves when it is over. */
	show(data: ConversationData): Promise<void> {
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
			const currentPanel = sd.anchor.endsWith("Left") ? this.leftPanel : this.rightPanel
			const presenter = currentPanel.display(sd)
			presenter.next()

			currentPanel.edge = sd.anchor.startsWith("Upper") ? "top" : "bottom"
			void this.#movePanel(currentPanel, true)

			yield
			while (!presenter.next().done) yield

			void this.#movePanel(currentPanel, false).then(() => this.#conversation?.next())

			yield
		}

		this.#complete?.()
	}

	/** Slides `panel` in or out; resolves once it's there. */
	#movePanel(panel: ConversationPanel, shown: boolean): Promise<void> {
		panel.shown = shown
		const transition = wait(ConversationPanel.transition.duration)
		this.#transition = transition
		void transition.then(() => {
			if (this.#transition === transition) this.#transition = null
		})
		return transition
	}
}
