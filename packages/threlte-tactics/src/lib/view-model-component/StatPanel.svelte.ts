import { quadOut } from "svelte/easing"
import type { SpriteName } from "#lib/assets/textures/ui/sprites.ts"
import { Alliances } from "#lib/enums/Alliances.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Unit } from "./Unit.svelte.ts"

/**
 * Port of `View Model Component/StatPanel.cs`: a unit's portrait, name, HP, MP and level, as of
 * when it was displayed. Rendered by `<StatPanelView>`, which slides it in from its side of the
 * screen while `shown`.
 */
export class StatPanel {
	/** How it slides in and out (seconds). */
	static readonly transition = { duration: 0.5, easing: quadOut }

	/** Whether it's on screen. */
	shown = $state(false)
	readonly allyBackground: SpriteName = "BlueAttackPanel"
	readonly enemyBackground: SpriteName = "RedAttackPanel"
	/** Red for an enemy, blue for anyone else. */
	background: SpriteName = $state("BlueAttackPanel")
	/** The portrait (the same for every unit). */
	avatar: SpriteName = $state("Avatar")
	// The labels' texts, starting with the prefab's placeholders.
	nameLabel = $state("Arthur")
	hpLabel = $state("HP 90 / 90")
	mpLabel = $state("MP 20 / 22")
	lvLabel = $state("LV. 5")

	display(obj: Unit): void {
		const alliance = obj.alliance!
		this.background = alliance.type === Alliances.Enemy ? this.enemyBackground : this.allyBackground
		this.nameLabel = obj.name
		const stats = obj.stats
		this.hpLabel = `HP ${stats.get(StatTypes.HP)} / ${stats.get(StatTypes.MHP)}`
		this.mpLabel = `MP ${stats.get(StatTypes.MP)} / ${stats.get(StatTypes.MMP)}`
		this.lvLabel = `LV. ${stats.get(StatTypes.LVL)}`
	}
}
