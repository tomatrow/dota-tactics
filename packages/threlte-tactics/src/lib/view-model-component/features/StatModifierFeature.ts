import type { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Stats } from "#lib/view-model-component/actor/Stats.ts"
import { Feature } from "./Feature.ts"

/** Port of `View Model Component/Features/StatModifierFeature.cs`: adds `amount` to a stat. */
export class StatModifierFeature extends Feature {
	type: StatTypes
	amount: number

	constructor(type: StatTypes, amount = 0) {
		super()
		this.type = type
		this.amount = amount
	}

	private get stats(): Stats {
		return this._target!.stats
	}

	protected onApply(): void {
		this.stats.set(this.type, this.stats.get(this.type) + this.amount)
	}

	protected onRemove(): void {
		this.stats.set(this.type, this.stats.get(this.type) - this.amount)
	}
}
