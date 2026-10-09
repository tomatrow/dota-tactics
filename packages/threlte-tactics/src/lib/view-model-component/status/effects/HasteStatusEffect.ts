import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { ValueChangeException } from "#lib/exceptions/ValueChangeException.ts"
import { MultDeltaModifier } from "#lib/exceptions/modifiers/MultDeltaModifier.ts"
import { Stats } from "#lib/view-model-component/actor/Stats.ts"
import { StatusEffect } from "./StatusEffect.ts"

/**
 * Port of `View Model Component/Status/Effects/HasteStatusEffect.cs`: doubles what its unit's turn
 * counter (CTR) gains, so the unit gets turns about twice as often.
 */
export class HasteStatusEffect extends StatusEffect {
	override enable(): void {
		this.notifications.addObserver(
			this.#onCounterWillChange,
			Stats.willChangeNotification(StatTypes.CTR),
			this.owner.stats
		)
	}

	override disable(): void {
		this.notifications.removeObserver(
			this.#onCounterWillChange,
			Stats.willChangeNotification(StatTypes.CTR),
			this.owner.stats
		)
	}

	readonly #onCounterWillChange = (_sender: Stats, exc: ValueChangeException): void => {
		const m = new MultDeltaModifier(0, 2)
		exc.addModifier(m)
	}
}
