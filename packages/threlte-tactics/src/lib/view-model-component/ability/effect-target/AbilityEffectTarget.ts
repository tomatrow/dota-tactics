import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"

/**
 * Port of `View Model Component/Ability/Effect Target/AbilityEffectTarget.cs`: whether an
 * ability's effect applies to what stands on a tile.
 */
export abstract class AbilityEffectTarget {
	abstract isTarget(tile: Tile | null): boolean
}
