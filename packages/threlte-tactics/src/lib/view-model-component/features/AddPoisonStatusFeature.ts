import { PoisonStatusEffect } from "#lib/view-model-component/status/effects/PoisonStatusEffect.ts"
import { AddStatusFeature } from "./AddStatusFeature.ts"

/** Port of `View Model Component/Features/AddPoisonStatusFeature.cs`, e.g. for a cursed sword. */
export class AddPoisonStatusFeature extends AddStatusFeature<PoisonStatusEffect> {
	protected readonly effectType = PoisonStatusEffect
}
