import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { BaseAbilityPower, type AbilityPowerContext } from "./BaseAbilityPower.ts"

/**
 * Port of `View Model Component/Ability/Power/MagicalAbilityPower.cs`: magical (the attacker's magic attack against the defender's magic defense), at a power of
 * `level`.
 */
export class MagicalAbilityPower extends BaseAbilityPower {
	level: number

	constructor(owner: Unit, context: AbilityPowerContext, { level = 0 }: { level?: number } = {}) {
		super(owner, context)
		this.level = level
	}

	protected getBaseAttack(): number {
		return this.owner.stats.get(StatTypes.MAT)
	}

	protected getBaseDefense(target: Unit): number {
		return target.stats.get(StatTypes.MDF)
	}

	protected getPower(): number {
		return this.level
	}
}
