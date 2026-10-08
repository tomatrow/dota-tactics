import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { AbilityEffectTarget } from "./AbilityEffectTarget.ts"

/**
 * Port of `View Model Component/Ability/Effect Target/UndeadAbilityEffectTarget.cs`: a unit with
 * hit points left that is undead (`toggle` true) or isn't (false).
 */
export class UndeadAbilityEffectTarget extends AbilityEffectTarget {
	/**
	 * Indicates whether the Undead component must be present (true)
	 * or must not be present (false) for the target to be valid.
	 */
	toggle: boolean

	constructor({ toggle = false } = {}) {
		super()
		this.toggle = toggle
	}

	override isTarget(tile: Tile | null): boolean {
		if (tile === null || tile.content === null) return false

		const hasComponent = tile.content.undead !== null
		if (hasComponent !== this.toggle) return false

		const s = tile.content.stats
		return s.get(StatTypes.HP) > 0
	}
}
