import { clamp } from "#lib/common/unity/mathf.ts"
import { Facings } from "#lib/enums/Facings.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { getFacing } from "#lib/extensions/FacingsExtensions.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { HitRate } from "./HitRate.ts"

/**
 * Port of `View Model Component/Ability/Hit Rate/STypeHitRate.cs`: for inflicting statuses. The
 * defender's resistance (RES) counts in full from the front, 10 less from the side and 20 less
 * from behind.
 */
export class STypeHitRate extends HitRate {
	calculate(target: Tile): number {
		const defender = target.content!
		if (this.automaticMiss(defender)) return this.final(100)

		if (this.automaticHit(defender)) return this.final(0)

		let res = this.#getResistance(defender)
		res = this.adjustForStatusEffects(defender, res)
		res = this.#adjustForRelativeFacing(defender, res)
		res = clamp(res, 0, 100)
		return this.final(res)
	}

	#getResistance(target: Unit): number {
		const s = target.stats
		return s.get(StatTypes.RES)
	}

	#adjustForRelativeFacing(target: Unit, rate: number): number {
		switch (getFacing(this.attacker, target)) {
			case Facings.Front:
				return rate
			case Facings.Side:
				return rate - 10
			default:
				return rate - 20
		}
	}
}
