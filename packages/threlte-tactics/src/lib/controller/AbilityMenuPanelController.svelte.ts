import { quadOut } from "svelte/easing"
import { Panel } from "#lib/common/ui/Panel.ts"
import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
import { AbilityMenuEntry } from "#lib/view-model-component/AbilityMenuEntry.svelte.ts"

const ShowKey = "Show"
const HideKey = "Hide"

/**
 * Port of `Controller/AbilityMenuPanelController.cs`: the menu of commands, categories or abilities
 * in the bottom right corner. Rendered by `<AbilityMenuPanelControllerView>`.
 *
 * Unity pools the entries' GameObjects (`GameObjectPoolController`); here they are plain objects
 * that `{#each}` renders.
 */
export class AbilityMenuPanelController {
	/** The prefab's `Panel` positions. */
	readonly panel = new Panel([
		{
			name: HideKey,
			myAnchor: TextAnchor.LowerLeft,
			parentAnchor: TextAnchor.LowerRight,
			offset: [0, 20]
		},
		{
			name: ShowKey,
			myAnchor: TextAnchor.LowerRight,
			parentAnchor: TextAnchor.LowerRight,
			offset: [0, 20]
		}
	])
	/** Whether the canvas is active (`canvas.activeSelf`). */
	canvasActive = $state(true)
	title = $state("Ability")
	menuEntries: AbilityMenuEntry[] = $state.raw([])
	#selection = 0

	/** Unity's `Start`. */
	constructor() {
		this.panel.setPosition(HideKey, false)
		this.canvasActive = false
	}

	get selection(): number {
		return this.#selection
	}

	show(title: string, options: readonly string[]): void {
		this.canvasActive = true
		this.#clear()
		this.title = title
		this.menuEntries = options.map((option) => {
			const entry = new AbilityMenuEntry()
			entry.title = option
			return entry
		})
		this.#setSelection(0)
		void this.#togglePos(ShowKey)
	}

	hide(): void {
		void this.#togglePos(HideKey).then(() => {
			if (this.panel.currentPosition === this.panel.get(HideKey)) {
				this.#clear()
				this.canvasActive = false
			}
		})
	}

	setLocked(index: number, value: boolean): void {
		if (index < 0 || index >= this.menuEntries.length) return

		this.menuEntries[index]!.isLocked = value
		if (value && this.#selection === index) this.next()
	}

	next(): void {
		const count = this.menuEntries.length
		for (let i = this.#selection + 1; i < this.#selection + count; ++i) {
			const index = i % count
			if (this.#setSelection(index)) break
		}
	}

	previous(): void {
		const count = this.menuEntries.length
		for (let i = this.#selection - 1 + count; i > this.#selection; --i) {
			const index = i % count
			if (this.#setSelection(index)) break
		}
	}

	#clear(): void {
		this.menuEntries = []
	}

	#setSelection(value: number): boolean {
		if (this.menuEntries[value]!.isLocked) return false

		// Deselect the previously selected entry
		if (this.#inRange(this.#selection)) this.menuEntries[this.#selection]!.isSelected = false

		this.#selection = value

		// Select the new entry
		if (this.#inRange(this.#selection)) this.menuEntries[this.#selection]!.isSelected = true

		return true
	}

	#inRange(index: number): boolean {
		return index >= 0 && index < this.menuEntries.length
	}

	#togglePos(pos: string): Promise<void> {
		const transition = this.panel.setPosition(pos, true, { duration: 0.5, equation: quadOut })
		if (transition === null) throw new Error(`No panel position "${pos}"`)
		return transition
	}
}
