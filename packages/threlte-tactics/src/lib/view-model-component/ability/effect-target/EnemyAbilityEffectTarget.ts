import { Targets } from "#lib/enums/Targets.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { AbilityEffectTarget } from "./AbilityEffectTarget.ts"

/**
 * Port of `View Model Component/Ability/Effect Target/EnemyAbilityEffectTarget.cs`: a unit its
 * ability's unit counts as a foe.
 */
export class EnemyAbilityEffectTarget extends AbilityEffectTarget {
	readonly #owner: Unit

	/** `owner`: the unit whose ability this is. */
	constructor(owner: Unit) {
		super()
		this.#owner = owner
	}

	override isTarget(tile: Tile | null): boolean {
		if (tile === null || tile.content === null) return false

		// Read now, not when constructed: the factory adds the alliance after the abilities.
		const alliance = this.#owner.alliance!
		const other = tile.content.alliance!
		return alliance.isMatch(other, Targets.Foe)
	}
}
