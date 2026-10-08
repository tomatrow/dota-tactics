import { quadInOut } from "svelte/easing"
import { Panel, type PanelPosition } from "#lib/common/ui/Panel.ts"
import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"

const ShowKey = "Show"
const HideKey = "Hide"

const { UpperCenter, LowerCenter } = TextAnchor

/** The `Hit Success Indicator.prefab` panel's position list. */
const positionList: PanelPosition[] = [
	{ name: HideKey, myAnchor: UpperCenter, parentAnchor: LowerCenter, offset: [0, 0] },
	{ name: ShowKey, myAnchor: LowerCenter, parentAnchor: LowerCenter, offset: [0, 130] }
]

/**
 * Port of `View Model Component/HitSuccessIndicator.cs`: the arrow above the bottom of the screen
 * that shows an ability's chance to hit, and how many points it changes. Rendered by
 * `<HitSuccessIndicatorView>`.
 */
export class HitSuccessIndicator {
	readonly panel = new Panel(positionList)
	/** Whether the canvas is active (`canvas.activeSelf`). */
	canvasActive = $state(true)
	/** `arrow.fillAmount` */
	fillAmount = $state(1)
	/** `label.text` */
	label = $state("")
	/** `label.color`, starting with the prefab's. */
	labelColor = $state("rgb(145 34 41)")

	/** Unity's `Start`. */
	constructor() {
		this.panel.setPosition(HideKey, false)
		this.canvasActive = false
	}

	setStats(chance: number, amount: number): void {
		this.fillAmount = chance / 100
		this.label = `${chance}% ${Math.abs(amount)}pt(s)`
		// `Color.green` or `Color.red`.
		this.labelColor = amount > 0 ? "#00ff00" : "#ff0000"
	}

	show(): void {
		this.canvasActive = true
		this.#setPanelPos(ShowKey)
	}

	hide(): void {
		const transition = this.#setPanelPos(HideKey)
		void transition.then(() => {
			this.canvasActive = false
		})
	}

	#setPanelPos(pos: string): Promise<void> {
		// (Starting the new tween stops the previous one, which then never completes.)
		return this.panel.setPosition(pos, true, { duration: 0.5, equation: quadInOut })!
	}
}
