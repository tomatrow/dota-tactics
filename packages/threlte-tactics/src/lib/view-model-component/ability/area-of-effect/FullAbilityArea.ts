import type { Point } from "#lib/model/Point.ts"
import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { AbilityRange } from "../range/AbilityRange.ts"
import { AbilityArea } from "./AbilityArea.ts"

/**
 * Port of `View Model Component/Ability/Area Of Effect/FullAbilityArea.cs`: every tile in the
 * ability's range, which it is created with.
 */
export class FullAbilityArea extends AbilityArea {
	readonly #range: AbilityRange

	constructor(range: AbilityRange) {
		super()
		this.#range = range
	}

	override getTilesInArea(board: Board, _pos: Point): Tile[] {
		return this.#range.getTilesInRange(board)
	}
}
