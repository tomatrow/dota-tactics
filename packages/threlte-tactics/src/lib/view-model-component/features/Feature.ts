import type { Stats } from "#lib/view-model-component/actor/Stats.ts"

/**
 * What a feature modifies: a unit. Unity passes a GameObject and features look up the components
 * they need in it or its parents (an item or job is parented to its unit).
 */
export interface FeatureTarget {
	readonly stats: Stats
}

/**
 * Port of `View Model Component/Features/Feature.cs`: something an item or job does to its target,
 * either while it's active (equipment, jobs) or once (consumables).
 */
export abstract class Feature {
	#target: FeatureTarget | null = null

	protected get _target(): FeatureTarget | null {
		return this.#target
	}

	activate(target: FeatureTarget): void {
		if (this.#target === null) {
			this.#target = target
			this.onApply()
		}
	}

	deactivate(): void {
		if (this.#target !== null) {
			this.onRemove()
			this.#target = null
		}
	}

	apply(target: FeatureTarget): void {
		this.#target = target
		this.onApply()
		this.#target = null
	}

	protected abstract onApply(): void
	protected onRemove(): void {}
}
