import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Point } from "#lib/model/Point.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"

/** Port of `Controller/Battle States/ExploreState.cs`: look around the board, then confirm. */
// TODO(part 13): show the stat panel of the unit under the cursor.
export function exploreState(owner: BattleController) {
	return {
		move(direction: Point) {
			selectTile(owner, direction.add(owner.pos))
		},
		fire(button: number) {
			if (button === 0) return "CommandSelectionState"
		}
	} satisfies BattleStateHandlers
}
