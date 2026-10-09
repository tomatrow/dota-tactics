import { MathUtils } from "three"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { BaseAbilityEffect, maxDamage, minDamage } from "./BaseAbilityEffect.ts"

/**
 * Port of `View Model Component/Ability/Effects/DamageAbilityEffect.cs`: takes HP from the target.
 * The damage is the attacker's attack minus half the defender's defense, scaled by the ability's
 * power (a percentage), with ±10% variance; every step can be modified (see `BaseAbilityEffect`'s
 * notifications). Predicts and returns it negative.
 */
export class DamageAbilityEffect extends BaseAbilityEffect {
	predict(target: Tile): number {
		const attacker = this.owner
		const defender = target.content!

		// Get the attackers base attack stat considering
		// mission items, support check, status check, and equipment, etc
		const attack = this.getStat(attacker, defender, BaseAbilityEffect.getAttackNotification, 0)

		// Get the targets base defense stat considering
		// mission items, support check, status check, and equipment, etc
		const defense = this.getStat(attacker, defender, BaseAbilityEffect.getDefenseNotification, 0)

		// Calculate base damage
		let damage = attack - Math.trunc(defense / 2)
		damage = Math.max(damage, 1)

		// Get the abilities power stat considering possible variations
		const power = this.getStat(attacker, defender, BaseAbilityEffect.getPowerNotification, 0)

		// Apply power bonus
		damage = Math.trunc((power * damage) / 100)
		damage = Math.max(damage, 1)

		// Tweak the damage based on a variety of other checks like
		// Elemental damage, Critical Hits, Damage multipliers, etc.
		damage = this.getStat(attacker, defender, BaseAbilityEffect.tweakDamageNotification, damage)

		// Clamp the damage to a range
		damage = MathUtils.clamp(damage, minDamage, maxDamage)
		return -damage
	}

	protected onApply(target: Tile): number {
		const defender = target.content!

		// Start with the predicted damage value
		let value = this.predict(target)

		// Add some random variance
		value = Math.floor(value * this.random.rangeFloat(0.9, 1.1))

		// Clamp the damage to a range
		value = MathUtils.clamp(value, minDamage, maxDamage)

		// Apply the damage to the target
		const s = defender.stats
		s.set(StatTypes.HP, s.get(StatTypes.HP) + value)
		return value
	}
}
