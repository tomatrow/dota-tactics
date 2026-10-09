import { quadOut } from "svelte/easing"
import { AbilityMenuEntry } from "#lib/view-model-component/AbilityMenuEntry.svelte.ts"

/**
 * Port of `Controller/AbilityMenuPanelController.cs`: the menu of commands, categories or abilities
 * in the bottom right corner. Rendered by `<AbilityMenuPanelControllerView>`, which slides it in
 * from the right while `shown`.
 */
export class AbilityMenuPanelController {
	/** How it slides in and out (seconds). */
	static readonly transition = { duration: 0.5, easing: quadOut }

	/** Whether it's on screen. */
	shown = $state(false)
	title = $state("Ability")
	menuEntries: AbilityMenuEntry[] = $state.raw([])
	#selection = 0

	get selection(): number {
		return this.#selection
	}

	show(title: string, options: readonly string[]): void {
		this.#clear()
		this.title = title
		this.menuEntries = options.map((option) => {
			const entry = new AbilityMenuEntry()
			entry.title = option
			return entry
		})
		this.#setSelection(0)
		this.shown = true
	}

	/** Slides the menu out, its entries with it. */
	hide(): void {
		this.shown = false
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
}
