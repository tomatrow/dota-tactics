import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { BaseAbilityEffect, type AbilityEffectContext } from "./BaseAbilityEffect.ts"

/**
 * Port of `View Model Component/Ability/Effects/ReviveAbilityEffect.cs`: sets the target's HP to
 * `percent` (0–1) of its max HP.
 */
export class ReviveAbilityEffect extends BaseAbilityEffect {
	percent: number

	constructor(owner: Unit, context: AbilityEffectContext, { percent = 0 } = {}) {
		super(owner, context)
		this.percent = percent
	}

	predict(target: Tile): number {
		const s = target.content!.stats
		return Math.floor(s.get(StatTypes.MHP) * this.percent)
	}

	protected onApply(target: Tile): number {
		const s = target.content!.stats
		const value = this.predict(target)
		s.set(StatTypes.HP, value)
		return value
	}
}
