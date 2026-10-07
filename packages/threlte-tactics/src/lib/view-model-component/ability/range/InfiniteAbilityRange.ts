import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { AbilityRange } from "./AbilityRange.ts"

/** Port of `View Model Component/Ability/Range/InfiniteAbilityRange.cs`: the whole board. */
export class InfiniteAbilityRange extends AbilityRange {
	override get positionOriented(): boolean {
		return false
	}

	override getTilesInRange(board: Board): Tile[] {
		return [...board.tiles.values()]
	}
}
