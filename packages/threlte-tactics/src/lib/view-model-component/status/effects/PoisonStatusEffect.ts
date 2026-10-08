import { TurnOrderController } from "#lib/controller/TurnOrderController.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { StatusEffect } from "./StatusEffect.ts"

/**
 * Port of `View Model Component/Status/Effects/PoisonStatusEffect.cs`: as each of its unit's turns
 * begins, the unit loses a tenth of its max HP (never below 0, and nothing can prevent it).
 */
export class PoisonStatusEffect extends StatusEffect {
	override onEnable(): void {
		this.notifications.addObserver(
			this.#onNewTurn,
			TurnOrderController.turnBeganNotification,
			this.owner
		)
	}

	override onDisable(): void {
		this.notifications.removeObserver(
			this.#onNewTurn,
			TurnOrderController.turnBeganNotification,
			this.owner
		)
	}

	readonly #onNewTurn = (): void => {
		const s = this.owner.stats
		const currentHP = s.get(StatTypes.HP)
		const maxHP = s.get(StatTypes.MHP)
		const reduce = Math.min(currentHP, Math.floor(maxHP * 0.1))
		s.setValue(StatTypes.HP, currentHP - reduce, false)
	}
}
