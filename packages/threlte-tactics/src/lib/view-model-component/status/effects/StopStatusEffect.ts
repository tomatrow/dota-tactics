import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { ValueChangeException } from "#lib/exceptions/ValueChangeException.ts"
import { Stats } from "#lib/view-model-component/actor/Stats.ts"
import { StatusEffect } from "./StatusEffect.ts"

/**
 * Port of `View Model Component/Status/Effects/StopStatusEffect.cs`: its unit's turn counter (CTR)
 * can't change, so the unit gets no turns.
 */
// TODO(part 18): attacks on a stopped unit always hit.
export class StopStatusEffect extends StatusEffect {
	override onEnable(): void {
		this.notifications.addObserver(
			this.#onCounterWillChange,
			Stats.willChangeNotification(StatTypes.CTR),
			this.owner.stats
		)
	}

	override onDisable(): void {
		this.notifications.removeObserver(
			this.#onCounterWillChange,
			Stats.willChangeNotification(StatTypes.CTR),
			this.owner.stats
		)
	}

	readonly #onCounterWillChange = (_sender: Stats, exc: ValueChangeException): void => {
		exc.flipToggle()
	}
}
