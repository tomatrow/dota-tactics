import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { DurationStatusCondition } from "#lib/view-model-component/status/conditions/DurationStatusCondition.ts"
import { BlindStatusEffect } from "#lib/view-model-component/status/effects/BlindStatusEffect.ts"
import { PoisonStatusEffect } from "#lib/view-model-component/status/effects/PoisonStatusEffect.ts"
import type { StatusEffectType } from "#lib/view-model-component/status/effects/StatusEffect.ts"
import { BaseAbilityEffect } from "./BaseAbilityEffect.ts"

const curableTypes = new Set<StatusEffectType>([PoisonStatusEffect, BlindStatusEffect])

/**
 * Port of `View Model Component/Ability/Effects/EsunaAbilityEffect.cs`: cures the target's poison
 * and blindness (those that wear off).
 */
export class EsunaAbilityEffect extends BaseAbilityEffect {
	predict(): number {
		return 0
	}

	protected onApply(target: Tile): number {
		const defender = target.content!
		const status = defender.status

		const candidates = status.getConditions(DurationStatusCondition)
		for (let i = candidates.length - 1; i >= 0; --i) {
			const effect = status.getEffectOf(candidates[i]!)!
			if (curableTypes.has(effect.constructor as StatusEffectType)) candidates[i]!.remove()
		}
		return 0
	}
}
