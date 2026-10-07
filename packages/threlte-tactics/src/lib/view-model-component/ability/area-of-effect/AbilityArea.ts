import type { Point } from "#lib/model/Point.ts"
import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"

/**
 * Port of `View Model Component/Ability/Area Of Effect/AbilityArea.cs`: the tiles an ability
 * affects once aimed at `pos` (a tile in its range, or the user's own for direction oriented
 * ranges).
 */
export abstract class AbilityArea {
	abstract getTilesInArea(board: Board, pos: Point): Tile[]
}
