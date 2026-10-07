import type { Feature, FeatureTarget } from "#lib/view-model-component/features/Feature.ts"

/** Port of `View Model Component/Item/Consumable.cs`: an item whose features apply once. */
export class Consumable {
	/** The item's features (Unity's `GetComponentsInChildren<Feature>()`). */
	readonly features: readonly Feature[]

	constructor(features: readonly Feature[]) {
		this.features = features
	}

	consume(target: FeatureTarget): void {
		for (const feature of this.features) feature.apply(target)
	}
}
