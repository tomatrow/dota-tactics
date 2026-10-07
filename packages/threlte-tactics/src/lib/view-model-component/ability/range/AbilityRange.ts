import { intMaxValue } from "#lib/common/unity/mathf.ts"
import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

/** An ability range's Inspector fields. */
export interface AbilityRangeOptions {
	/** How many tiles away it reaches (default 1). */
	horizontal?: number
	/** The most a reached tile's height may differ from the user's (default `int.MaxValue`). */
	vertical?: number
}

/**
 * Port of `View Model Component/Ability/Range/AbilityRange.cs`: the tiles an ability can reach
 * from its user.
 *
 * Unity's `unit` (`GetComponentInParent<Unit>()`) is the unit the range is created for.
 */
export abstract class AbilityRange {
	horizontal: number
	vertical: number
	protected readonly unit: Unit

	constructor(unit: Unit, { horizontal = 1, vertical = intMaxValue }: AbilityRangeOptions = {}) {
		this.unit = unit
		this.horizontal = horizontal
		this.vertical = vertical
	}

	/** Whether the user aims by picking a tile in range. */
	get positionOriented(): boolean {
		return true
	}

	/** Whether the user aims by turning: moving changes their facing, and with it the tiles. */
	get directionOriented(): boolean {
		return false
	}

	abstract getTilesInRange(board: Board): Tile[]
}
