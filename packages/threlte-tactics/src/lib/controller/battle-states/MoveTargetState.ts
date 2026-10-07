import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Point } from "#lib/model/Point.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"

/** Port of `Controller/Battle States/MoveTargetState.cs`: the player picks where to move. */
export function moveTargetState(owner: BattleController) {
	return {
		move(direction: Point) {
			selectTile(owner, direction.add(owner.pos))
		}
	} satisfies BattleStateHandlers
}
