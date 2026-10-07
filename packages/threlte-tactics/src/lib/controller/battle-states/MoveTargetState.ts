import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Point } from "#lib/model/Point.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"

/** Port of `Controller/Battle States/MoveTargetState.cs`: the player picks where to move. */
// TODO(part 13): stat panels. TODO(part 24): the computer's cursor.
export function moveTargetState(owner: BattleController) {
	let tiles: Tile[] = []

	return {
		_enter() {
			const mover = owner.turn.actor!.movement!
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
		fire(button: number) {
			if (button === 0) {
				if (tiles.includes(owner.currentTile!)) return "MoveSequenceState"
			} else {
				return "CommandSelectionState"
			}
		}
	} satisfies BattleStateHandlers
}
