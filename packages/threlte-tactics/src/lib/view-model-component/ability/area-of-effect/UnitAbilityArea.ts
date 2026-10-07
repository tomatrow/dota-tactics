import type { Point } from "#lib/model/Point.ts"
import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { AbilityArea } from "./AbilityArea.ts"

/** Port of `View Model Component/Ability/Area Of Effect/UnitAbilityArea.cs`: just the aimed tile. */
export class UnitAbilityArea extends AbilityArea {
	override getTilesInArea(board: Board, pos: Point): Tile[] {
		const retValue: Tile[] = []
		const tile = board.getTile(pos)
		if (tile !== null) retValue.push(tile)
		return retValue
	}
}
