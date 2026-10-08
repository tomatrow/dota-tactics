import { clamp } from "#lib/common/unity/mathf.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { BaseAbilityEffect, maxDamage, minDamage } from "./BaseAbilityEffect.ts"

/**
 * Port of `View Model Component/Ability/Effects/HealAbilityEffect.cs`: restores the ability's
 * power in HP, with ±10% variance.
 */
export class HealAbilityEffect extends BaseAbilityEffect {
	predict(target: Tile): number {
		const attacker = this.owner
		const defender = target.content!
		return this.getStat(attacker, defender, BaseAbilityEffect.getPowerNotification, 0)
	}

	protected onApply(target: Tile): number {
		const defender = target.content!

		// Start with the predicted value
		let value = this.predict(target)

		// Add some random variance
		value = Math.floor(value * this.random.rangeFloat(0.9, 1.1))

		// Clamp the amount to a range
		value = clamp(value, minDamage, maxDamage)

		// Apply the amount to the target
		const s = defender.stats
		s.set(StatTypes.HP, s.get(StatTypes.HP) + value)
		return value
	}
}
