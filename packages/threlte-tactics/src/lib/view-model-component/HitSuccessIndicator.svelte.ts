import { quadInOut } from "svelte/easing"

/**
 * Port of `View Model Component/HitSuccessIndicator.cs`: the arrow above the bottom of the screen
 * that shows an ability's chance to hit, and how many points it changes. Rendered by
 * `<HitSuccessIndicatorView>`, which slides it up from below the screen while `shown`.
 */
export class HitSuccessIndicator {
	/** How it slides in and out (seconds). */
	static readonly transition = { duration: 0.5, easing: quadInOut }

	/** Whether it's on screen. */
	shown = $state(false)
	/** How much of the arrow is filled, from 0 to 1. */
	fillAmount = $state(1)
	label = $state("")
	labelColor = $state("rgb(145 34 41)")

	setStats(chance: number, amount: number): void {
		this.fillAmount = chance / 100
		this.label = `${chance}% ${Math.abs(amount)}pt(s)`
		this.labelColor = amount > 0 ? "#00ff00" : "#ff0000"
	}

	show(): void {
		this.shown = true
	}

	hide(): void {
		this.shown = false
	}
}
