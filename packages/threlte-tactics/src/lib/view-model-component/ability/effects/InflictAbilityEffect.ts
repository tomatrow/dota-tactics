import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { DurationStatusCondition } from "#lib/view-model-component/status/conditions/DurationStatusCondition.ts"
import type { StatusEffectType } from "#lib/view-model-component/status/effects/StatusEffect.ts"
import {
	statusEffectTypes,
	type StatusEffectName
} from "#lib/view-model-component/status/effects/statusEffectTypes.ts"
import { BaseAbilityEffect, type AbilityEffectContext } from "./BaseAbilityEffect.ts"

/**
 * Port of `View Model Component/Ability/Effects/InflictAbilityEffect.cs`: puts the status effect
 * named `statusName` on the target for `duration` rounds.
 */
export class InflictAbilityEffect extends BaseAbilityEffect {
	statusName: string
	duration: number

	constructor(
		owner: Unit,
		context: AbilityEffectContext,
		{ statusName = "", duration = 0 }: { statusName?: string; duration?: number } = {}
	) {
		super(owner, context)
		this.statusName = statusName
		this.duration = duration
	}

	predict(_target: Tile): number {
		return 0
	}

	protected onApply(target: Tile): number {
		// Unity looks the class up by name (`Type.GetType`).
		const statusType: StatusEffectType | null =
			Object.hasOwn(statusEffectTypes, this.statusName) ?
				statusEffectTypes[this.statusName as StatusEffectName]
			:	null
		if (statusType === null) {
			console.error("Invalid Status Type")
			return 0
		}

		const status = target.content!.status
		const condition = status.add(statusType, DurationStatusCondition)
		condition.duration = this.duration
		return 0
	}
}
