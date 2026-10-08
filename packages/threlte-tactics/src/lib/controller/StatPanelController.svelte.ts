import { quadOut } from "svelte/easing"
import type { PanelPosition } from "#lib/common/ui/Panel.ts"
import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
import { StatPanel } from "#lib/view-model-component/StatPanel.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

const ShowKey = "Show"
const HideKey = "Hide"

const { LowerLeft, LowerRight } = TextAnchor

/** The `Stat Panel Controller.prefab` panels' position lists. */
const primaryPositions: PanelPosition[] = [
	{ name: HideKey, myAnchor: LowerRight, parentAnchor: LowerLeft, offset: [0, 20] },
	{ name: ShowKey, myAnchor: LowerLeft, parentAnchor: LowerLeft, offset: [0, 20] }
]
const secondaryPositions: PanelPosition[] = [
	{ name: HideKey, myAnchor: LowerLeft, parentAnchor: LowerRight, offset: [0, 20] },
	{ name: ShowKey, myAnchor: LowerRight, parentAnchor: LowerRight, offset: [0, 20] }
]

/**
 * Port of `Controller/StatPanelController.cs`: slides the primary (bottom left) and secondary
 * (bottom right) stat panels in and out. Rendered by `<StatPanelControllerView>`.
 */
export class StatPanelController {
	readonly primaryPanel: StatPanel
	readonly secondaryPanel: StatPanel

	/** Unity's `Start`. */
	constructor() {
		this.primaryPanel = new StatPanel(primaryPositions)
		this.secondaryPanel = new StatPanel(secondaryPositions)
		if (this.primaryPanel.panel.currentPosition === null)
			this.primaryPanel.panel.setPosition(HideKey, false)
		if (this.secondaryPanel.panel.currentPosition === null)
			this.secondaryPanel.panel.setPosition(HideKey, false)
	}

	showPrimary(obj: Unit): void {
		this.primaryPanel.display(obj)
		this.#movePanel(this.primaryPanel, ShowKey)
	}

	hidePrimary(): void {
		this.#movePanel(this.primaryPanel, HideKey)
	}

	showSecondary(obj: Unit): void {
		this.secondaryPanel.display(obj)
		this.#movePanel(this.secondaryPanel, ShowKey)
	}

	hideSecondary(): void {
		this.#movePanel(this.secondaryPanel, HideKey)
	}

	#movePanel(obj: StatPanel, pos: string): void {
		const target = obj.panel.get(pos)
		if (obj.panel.currentPosition !== target) {
			// (Starting the new tween stops the previous one: Unity's `t.Stop()`.)
			void obj.panel.setPosition(pos, true, { duration: 0.5, equation: quadOut })
		}
	}
}
