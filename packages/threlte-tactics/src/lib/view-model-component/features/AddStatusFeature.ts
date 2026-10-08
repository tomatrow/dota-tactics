import { StatusCondition } from "#lib/view-model-component/status/conditions/StatusCondition.ts"
import type {
	StatusEffect,
	StatusEffectType
} from "#lib/view-model-component/status/effects/StatusEffect.ts"
import { Feature } from "./Feature.ts"

/**
 * Port of `View Model Component/Features/AddStatusFeature.cs`: puts a `T` status effect on its
 * target for as long as the feature is active (a manual `StatusCondition`).
 */
export abstract class AddStatusFeature<T extends StatusEffect> extends Feature {
	/** Unity's type argument `T`. */
	protected abstract readonly effectType: StatusEffectType<T>

	#statusCondition: StatusCondition | null = null

	protected onApply(): void {
		const status = this._target!.status
		this.#statusCondition = status.add(this.effectType, StatusCondition)
	}

	protected override onRemove(): void {
		if (this.#statusCondition !== null) this.#statusCondition.remove()
	}
}
