import { clamp } from "#lib/common/unity/mathf.ts"
import { Facings } from "#lib/enums/Facings.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { getFacing } from "#lib/extensions/FacingsExtensions.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { HitRate } from "./HitRate.ts"

/**
 * Port of `View Model Component/Ability/Hit Rate/ATypeHitRate.cs`: for attacks. The defender's
 * evade (EVD) counts in full from the front, half from the side and a quarter from behind.
 */
export class ATypeHitRate extends HitRate {
	calculate(target: Tile): number {
		const defender = target.content!
		if (this.automaticHit(defender)) return this.final(0)

		if (this.automaticMiss(defender)) return this.final(100)

		let evade = this.#getEvade(defender)
		evade = this.#adjustForRelativeFacing(defender, evade)
		evade = this.adjustForStatusEffects(defender, evade)
		evade = clamp(evade, 5, 95)
		return this.final(evade)
	}

	#getEvade(target: Unit): number {
		const s = target.stats
		return clamp(s.get(StatTypes.EVD), 0, 100)
	}

	#adjustForRelativeFacing(target: Unit, rate: number): number {
		switch (getFacing(this.attacker, target)) {
			case Facings.Front:
				return rate
			case Facings.Side:
				return Math.trunc(rate / 2)
			default:
				return Math.trunc(rate / 4)
		}
	}
}
