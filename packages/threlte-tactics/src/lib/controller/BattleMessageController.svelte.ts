import { quadInOut } from "svelte/easing"
import { wait } from "#lib/common/time.ts"

/**
 * Port of `Controller/BattleMessageController.cs`: a bar across the top of the screen that fades
 * in with a message (the ability a computer-driven unit uses), stays a second, and fades out.
 * Rendered by `<BattleMessageControllerView>`, which fades it while `shown` changes.
 */
export class BattleMessageController {
	/** How it fades in and out (seconds). */
	static readonly transition = { duration: 0.5, easing: quadInOut }

	/** Whether it's on screen. */
	shown = $state(false)
	label = $state("New Text")

	display(message: string): void {
		this.shown = true
		this.label = message
		void this.#sequence()
	}

	async #sequence(): Promise<void> {
		// Fade in, then stay a second.
		await wait(BattleMessageController.transition.duration + 1)
		this.shown = false
	}
}
