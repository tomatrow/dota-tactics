import type { Ability } from "#lib/view-model-component/ability/Ability.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import type { PlanOfAttack } from "../PlanOfAttack.ts"

/**
 * Port of `View Model Component/AI/Ability Picker/BaseAbilityPicker.cs`: picks the ability a
 * computer-driven unit uses, and whom it is for (a plan's `ability` and `target`).
 */
export abstract class BaseAbilityPicker {
	/** The unit whose attack pattern this is part of. */
	protected readonly owner: Unit

	constructor(owner: Unit) {
		this.owner = owner
	}

	abstract pick(plan: PlanOfAttack): void

	/** The owner's ability named `abilityName`, from the first category of its catalog that has it. */
	protected find(abilityName: string): Ability | null {
		const ac = this.owner.abilityCatalog!
		for (const category of ac.categories) {
			const child = category.abilities.find((ability) => ability.name === abilityName)
			if (child) return child
		}
		return null
	}

	/** The owner's first ability (`GetComponentInChildren<Ability>()`): its attack. */
	protected default(): Ability | null {
		return this.owner.attack
	}
}
