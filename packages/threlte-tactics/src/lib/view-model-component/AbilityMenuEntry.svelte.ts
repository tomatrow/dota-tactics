import type { SpriteName } from "#lib/assets/textures/ui/sprites.ts"

/** Unity's `[Flags] enum States`. */
const States = {
	None: 0,
	Selected: 1 << 0,
	Locked: 1 << 1
} as const

/**
 * Port of `View Model Component/AbilityMenuEntry.cs`: one line of the ability menu, normal,
 * selected or locked. Rendered by `<AbilityMenuEntryView>`.
 */
export class AbilityMenuEntry {
	title = $state("")
	// The look `State`'s setter changes; it starts as the prefab sets it up.
	bullet: SpriteName = $state("MenuBullet")
	labelColor = $state("rgb(255 255 255)")
	outlineColor = $state("rgb(20 36 44 / 0.5)")

	#state: number = States.None

	get isLocked(): boolean {
		return (this.#state & States.Locked) !== States.None
	}

	set isLocked(value: boolean) {
		this.#setState(value ? this.#state | States.Locked : this.#state & ~States.Locked)
	}

	get isSelected(): boolean {
		return (this.#state & States.Selected) !== States.None
	}

	set isSelected(value: boolean) {
		this.#setState(value ? this.#state | States.Selected : this.#state & ~States.Selected)
	}

	reset(): void {
		this.#setState(States.None)
	}

	#setState(value: number): void {
		if (this.#state === value) return
		this.#state = value

		if (this.isLocked) {
			this.bullet = "MenuBulletLocked"
			// `Color.gray`
			this.labelColor = "rgb(128 128 128)"
			this.outlineColor = "rgb(20 36 44)"
		} else if (this.isSelected) {
			this.bullet = "MenuBulletSelected"
			this.labelColor = "rgb(249 210 118)"
			this.outlineColor = "rgb(255 160 72)"
		} else {
			this.bullet = "MenuBullet"
			this.labelColor = "rgb(255 255 255)"
			this.outlineColor = "rgb(20 36 44)"
		}
	}
}
