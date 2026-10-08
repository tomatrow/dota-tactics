import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { HitRate } from "./HitRate.ts"

/**
 * Port of `View Model Component/Ability/Hit Rate/FullTypeHitRate.cs`: always hits, unless
 * something makes it miss.
 */
export class FullTypeHitRate extends HitRate {
	override get isAngleBased(): boolean {
		return false
	}

	calculate(target: Tile): number {
		const defender = target.content!
		if (this.automaticMiss(defender)) return this.final(100)

		return this.final(0)
	}
}
