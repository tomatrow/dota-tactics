import { TurnOrderController } from "#lib/controller/TurnOrderController.ts"
import { StatusCondition } from "./StatusCondition.ts"

/**
 * Port of `View Model Component/Status/Conditions/DurationStatusCondition.cs`: lasts `duration`
 * rounds.
 */
export class DurationStatusCondition extends StatusCondition {
	duration = 10

	override onEnable(): void {
		this.status.notifications.addObserver(
			this.#onNewTurn,
			TurnOrderController.roundBeganNotification
		)
	}

	override onDisable(): void {
		this.status.notifications.removeObserver(
			this.#onNewTurn,
			TurnOrderController.roundBeganNotification
		)
	}

	readonly #onNewTurn = (): void => {
		this.duration--
		if (this.duration <= 0) this.remove()
	}
}
