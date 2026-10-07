import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Point } from "#lib/model/Point.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/SelectUnitState.cs` as of the path finding part: the player
 * picks any unit to move.
 */
// TODO(part 16): let the turn order pick the unit instead.
export function selectUnitState(owner: BattleController) {
	return {
		move(direction: Point) {
			selectTile(owner, direction.add(owner.pos))
		},
		fire() {
			const content = owner.currentTile!.content
			if (content !== null) {
				owner.currentUnit = content
				return "MoveTargetState"
			}
		}
	} satisfies BattleStateHandlers
}
