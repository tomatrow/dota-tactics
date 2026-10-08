import { Targets } from "#lib/enums/Targets.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import type { PlanOfAttack } from "../PlanOfAttack.ts"
import { BaseAbilityPicker } from "./BaseAbilityPicker.ts"

/**
 * Port of `View Model Component/AI/Ability Picker/FixedAbilityPicker.cs`: always the ability named
 * `ability`, for `target`; the unit's attack, for a foe, if it doesn't have one by that name.
 */
export class FixedAbilityPicker extends BaseAbilityPicker {
	target: Targets
	ability: string

	constructor(owner: Unit, { target, ability }: { target: Targets; ability: string }) {
		super(owner)
		this.target = target
		this.ability = ability
	}

	override pick(plan: PlanOfAttack): void {
		plan.target = this.target
		plan.ability = this.find(this.ability)

		if (plan.ability === null) {
			plan.ability = this.default()
			plan.target = Targets.Foe
		}
	}
}
