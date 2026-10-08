import type { SpriteName } from "#lib/assets/textures/ui/sprites.ts"
import { Panel, type PanelPosition } from "#lib/common/ui/Panel.ts"
import { Alliances } from "#lib/enums/Alliances.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Unit } from "./Unit.svelte.ts"

/**
 * Port of `View Model Component/StatPanel.cs`: a unit's portrait, name, HP, MP and level, as of
 * when it was displayed. Rendered by `<StatPanelView>`.
 */
export class StatPanel {
	readonly panel: Panel
	readonly allyBackground: SpriteName = "BlueAttackPanel"
	readonly enemyBackground: SpriteName = "RedAttackPanel"
	/** `background.sprite` */
	background: SpriteName = $state("BlueAttackPanel")
	/** `avatar.sprite` */
	avatar: SpriteName = $state("Avatar")
	// The labels' texts, starting with the prefab's placeholders.
	nameLabel = $state("Arthur")
	hpLabel = $state("HP 90 / 90")
	mpLabel = $state("MP 20 / 22")
	lvLabel = $state("LV. 5")

	constructor(positionList: readonly PanelPosition[]) {
		this.panel = new Panel(positionList)
	}

	display(obj: Unit): void {
		const alliance = obj.alliance!
		this.background = alliance.type === Alliances.Enemy ? this.enemyBackground : this.allyBackground
		// avatar.sprite = null; Need a component which provides this data
		this.nameLabel = obj.name
		const stats = obj.stats
		this.hpLabel = `HP ${stats.get(StatTypes.HP)} / ${stats.get(StatTypes.MHP)}`
		this.mpLabel = `MP ${stats.get(StatTypes.MP)} / ${stats.get(StatTypes.MMP)}`
		this.lvLabel = `LV. ${stats.get(StatTypes.LVL)}`
	}
}
