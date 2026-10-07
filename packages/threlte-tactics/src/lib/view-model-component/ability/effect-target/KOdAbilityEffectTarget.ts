import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { AbilityEffectTarget } from "./AbilityEffectTarget.ts"

/**
 * Port of `View Model Component/Ability/Effect Target/KOdAbilityEffectTarget.cs`: a unit with no
 * hit points left.
 */
export class KOdAbilityEffectTarget extends AbilityEffectTarget {
	override isTarget(tile: Tile | null): boolean {
		if (tile === null || tile.content === null) return false

		const s = tile.content.stats
		return s.get(StatTypes.HP) <= 0
	}
}
