import type { Random } from "#lib/common/Random.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import type { PlanOfAttack } from "../PlanOfAttack.ts"
import { BaseAbilityPicker } from "./BaseAbilityPicker.ts"

/**
 * Port of `View Model Component/AI/Ability Picker/RandomAbilityPicker.cs`: lets one of `pickers`,
 * chosen at random, pick.
 */
export class RandomAbilityPicker extends BaseAbilityPicker {
	pickers: BaseAbilityPicker[] = []
	readonly #random: Random

	constructor(owner: Unit, random: Random) {
		super(owner)
		this.#random = random
	}

	override pick(plan: PlanOfAttack): void {
		const index = this.#random.int(0, this.pickers.length)
		const p = this.pickers[index]!
		p.pick(plan)
	}
}
