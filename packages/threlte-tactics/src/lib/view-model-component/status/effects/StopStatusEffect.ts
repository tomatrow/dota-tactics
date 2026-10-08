import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { MatchException } from "#lib/exceptions/MatchException.ts"
import type { ValueChangeException } from "#lib/exceptions/ValueChangeException.ts"
import { HitRate } from "#lib/view-model-component/ability/hit-rate/HitRate.ts"
import { Stats } from "#lib/view-model-component/actor/Stats.ts"
import { StatusEffect } from "./StatusEffect.ts"

/**
 * Port of `View Model Component/Status/Effects/StopStatusEffect.cs`: its unit's turn counter (CTR)
 * can't change, so the unit gets no turns; and attacks on it always hit.
 */
export class StopStatusEffect extends StatusEffect {
	override onEnable(): void {
		this.notifications.addObserver(
			this.#onCounterWillChange,
			Stats.willChangeNotification(StatTypes.CTR),
			this.owner.stats
		)
		this.notifications.addObserver(this.#onAutomaticHitCheck, HitRate.automaticHitCheckNotification)
	}

	override onDisable(): void {
		this.notifications.removeObserver(
			this.#onCounterWillChange,
			Stats.willChangeNotification(StatTypes.CTR),
			this.owner.stats
		)
		this.notifications.removeObserver(
			this.#onAutomaticHitCheck,
			HitRate.automaticHitCheckNotification
		)
	}

	readonly #onCounterWillChange = (_sender: Stats, exc: ValueChangeException): void => {
		exc.flipToggle()
	}

	readonly #onAutomaticHitCheck = (_sender: HitRate, exc: MatchException): void => {
		const owner = this.owner
		if (owner === exc.target) exc.flipToggle()
	}
}
