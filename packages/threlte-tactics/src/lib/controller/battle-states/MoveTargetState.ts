import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Point } from "#lib/model/Point.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"

/** Port of `Controller/Battle States/MoveTargetState.cs`: the player picks where to move. */
export function moveTargetState(owner: BattleController) {
	let tiles: Tile[] = []

	return {
		_enter() {
			const mover = owner.currentUnit!.movement!
			tiles = mover.getTilesInRange(owner.board)
			owner.board.selectTiles(tiles)
		},
		_exit() {
			owner.board.deSelectTiles(tiles)
			tiles = []
		},
		move(direction: Point) {
			selectTile(owner, direction.add(owner.pos))
		},
		fire() {
			if (tiles.includes(owner.currentTile!)) return "MoveSequenceState"
		}
	} satisfies BattleStateHandlers
}
