import type { BaseAbilityPicker } from "./ability-picker/BaseAbilityPicker.ts"
import type { PlanOfAttack } from "./PlanOfAttack.ts"

/**
 * Port of `View Model Component/AI/AttackPattern.cs`: a computer-driven unit's abilities, in
 * order. Each turn the next of its pickers picks, starting over after the last.
 */
export class AttackPattern {
	readonly pickers: readonly BaseAbilityPicker[]
	#index = 0

	constructor(pickers: readonly BaseAbilityPicker[]) {
		this.pickers = pickers
	}

	pick(plan: PlanOfAttack): void {
		this.pickers[this.#index]!.pick(plan)
		this.#index++
		if (this.#index >= this.pickers.length) this.#index = 0
	}
}
