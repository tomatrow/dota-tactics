import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { AbilityRange } from "./AbilityRange.ts"

/**
 * Port of `View Model Component/Ability/Range/ConstantAbilityRange.cs`: every tile within
 * `horizontal` steps of the user (their own included), whatever stands in the way.
 */
export class ConstantAbilityRange extends AbilityRange {
	override getTilesInRange(board: Board): Tile[] {
		return board.search(this.unit.tile!, this.#expandSearch)
	}

	readonly #expandSearch = (from: Tile, to: Tile): boolean =>
		from.distance + 1 <= this.horizontal &&
		Math.abs(to.height - this.unit.tile!.height) <= this.vertical
}
