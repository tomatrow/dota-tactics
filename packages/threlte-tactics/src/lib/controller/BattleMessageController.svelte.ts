import { quadInOut } from "svelte/easing"
import { Tween } from "svelte/motion"
import { reversed, tween } from "#lib/common/animation/Tweener.ts"
import { waitForSeconds } from "#lib/common/unity/time.ts"

/**
 * Port of `Controller/BattleMessageController.cs`: a bar across the top of the screen that fades
 * in with a message (the ability a computer-driven unit uses), stays a second, and fades out.
 * Rendered by `<BattleMessageControllerView>`.
 */
export class BattleMessageController {
	/** Whether the canvas is active (`canvas.activeSelf`); the prefab's isn't. */
	canvasActive = $state(false)
	/** `label.text`, starting with the prefab's. */
	label = $state("New Text")
	/** The canvas group's alpha, which the `EasingControl` (`ec`) animates. */
	readonly #alpha = new Tween(1)

	get alpha(): number {
		return this.#alpha.current
	}

	display(message: string): void {
		void this.#alpha.set(0, { duration: 0 })
		this.canvasActive = true
		this.label = message
		void this.#sequence()
	}

	async #sequence(): Promise<void> {
		// `ec.Play()`, then `ec.Reverse()`: half a second each, `EaseInOutQuad` (backwards).
		await tween(this.#alpha, 0, 1, 0.5, quadInOut)
		await waitForSeconds(1)
		await tween(this.#alpha, 1, 0, 0.5, reversed(quadInOut))
		this.canvasActive = false
	}
}
