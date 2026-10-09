import { StatPanel } from "#lib/view-model-component/StatPanel.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

/**
 * Port of `Controller/StatPanelController.cs`: slides the primary (bottom left) and secondary
 * (bottom right) stat panels in and out. Rendered by `<StatPanelControllerView>`.
 */
export class StatPanelController {
	readonly primaryPanel = new StatPanel()
	readonly secondaryPanel = new StatPanel()

	showPrimary(obj: Unit): void {
		this.primaryPanel.display(obj)
		this.primaryPanel.shown = true
	}

	hidePrimary(): void {
		this.primaryPanel.shown = false
	}

	showSecondary(obj: Unit): void {
		this.secondaryPanel.display(obj)
		this.secondaryPanel.shown = true
	}

	hideSecondary(): void {
		this.secondaryPanel.shown = false
	}
}
