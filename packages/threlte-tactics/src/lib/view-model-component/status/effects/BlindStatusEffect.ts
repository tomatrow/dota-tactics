import type { Info } from "#lib/model/Info.ts"
import { HitRate } from "#lib/view-model-component/ability/hit-rate/HitRate.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { StatusEffect } from "./StatusEffect.ts"

/**
 * Port of `View Model Component/Status/Effects/BlindStatusEffect.cs`: a blind unit's attacks miss
 * more (+50 to the defender's evade), and attacks on it hit more (−20).
 */
export class BlindStatusEffect extends StatusEffect {
	override onEnable(): void {
		this.notifications.addObserver(this.#onHitRateStatusCheck, HitRate.statusCheckNotification)
	}

	override onDisable(): void {
		this.notifications.removeObserver(this.#onHitRateStatusCheck, HitRate.statusCheckNotification)
	}

	readonly #onHitRateStatusCheck = (_sender: HitRate, info: Info<Unit, Unit, number>): void => {
		const owner = this.owner
		if (owner === info.arg0) {
			// The attacker is blind
			info.arg2 += 50
		} else if (owner === info.arg1) {
			// The defender is blind
			info.arg2 -= 20
		}
	}
}
