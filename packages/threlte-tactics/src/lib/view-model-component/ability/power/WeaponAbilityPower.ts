import { EquipSlots } from "#lib/enums/EquipSlots.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Job } from "#lib/view-model-component/actor/Job.ts"
import { StatModifierFeature } from "#lib/view-model-component/features/StatModifierFeature.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { BaseAbilityPower } from "./BaseAbilityPower.ts"

/**
 * Port of `View Model Component/Ability/Power/WeaponAbilityPower.cs`: physical, at the power of
 * the attack bonus of the unit's weapon, or unarmed, of its job's starting attack.
 */
export class WeaponAbilityPower extends BaseAbilityPower {
	protected getBaseAttack(): number {
		return this.owner.stats.get(StatTypes.ATK)
	}

	protected getBaseDefense(target: Unit): number {
		return target.stats.get(StatTypes.DEF)
	}

	protected getPower(): number {
		const power = this.#powerFromEquippedWeapon()
		return power > 0 ? power : this.#unarmedPower()
	}

	#powerFromEquippedWeapon(): number {
		let power = 0
		const eq = this.owner.equipment
		const item = eq.getItem(EquipSlots.Primary)
		// No weapon: the job's attack (see `PORTING.md` › Divergences).
		if (item === null) return power
		const features = item.features.filter((f) => f instanceof StatModifierFeature)

		for (const feature of features) if (feature.type === StatTypes.ATK) power += feature.amount

		return power
	}

	#unarmedPower(): number {
		const job = this.owner.job!
		for (let i = 0; i < Job.statOrder.length; ++i)
			if (Job.statOrder[i] === StatTypes.ATK) return job.baseStats[i]!
		return 0
	}
}
