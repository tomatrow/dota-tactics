import { TurnOrderController } from "#lib/controller/TurnOrderController.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { BaseException } from "#lib/exceptions/BaseException.ts"
import type { ValueChangeException } from "#lib/exceptions/ValueChangeException.ts"
import { Stats } from "#lib/view-model-component/actor/Stats.ts"
import type { Status } from "#lib/view-model-component/status/Status.ts"
import { StatusEffect } from "./StatusEffect.ts"

/**
 * Port of `View Model Component/Status/Effects/KnockOutStatusEffect.cs`: its unit is squashed
 * flat, gets no turns, and its turn counter (CTR) can't grow.
 */
export class KnockOutStatusEffect extends StatusEffect {
	readonly #stats: Stats

	/** Unity's `Awake`. */
	constructor(status: Status) {
		super(status)
		this.#stats = this.owner.stats
	}

	override onEnable(): void {
		this.owner.transform.scale = [0.75, 0.1, 0.75]
		this.notifications.addObserver(
			this.#onTurnCheck,
			TurnOrderController.turnCheckNotification,
			this.owner
		)
		this.notifications.addObserver(
			this.#onStatCounterWillChange,
			Stats.willChangeNotification(StatTypes.CTR),
			this.#stats
		)
	}

	override onDisable(): void {
		this.owner.transform.scale = [1, 1, 1]
		this.notifications.removeObserver(
			this.#onTurnCheck,
			TurnOrderController.turnCheckNotification,
			this.owner
		)
		this.notifications.removeObserver(
			this.#onStatCounterWillChange,
			Stats.willChangeNotification(StatTypes.CTR),
			this.#stats
		)
	}

	readonly #onTurnCheck = (_sender: unknown, exc: BaseException): void => {
		// Dont allow a KO'd unit to take turns
		if (exc.defaultToggle) exc.flipToggle()
	}

	readonly #onStatCounterWillChange = (_sender: Stats, exc: ValueChangeException): void => {
		// Dont allow a KO'd unit to increment the turn order counter
		if (exc.toValue > exc.fromValue) exc.flipToggle()
	}
}
