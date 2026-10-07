import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { getDirection } from "#lib/extensions/DirectionsExtensions.ts"
import type { Point } from "#lib/model/Point.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/EndFacingState.cs`: the actor picks the direction to face,
 * then the turn ends. Cancelling turns it back and returns to the commands.
 */
// TODO(part 22): the facing indicator. TODO(part 24): the computer picks a direction.
export function endFacingState(owner: BattleController) {
	const { turn } = owner
	let startDir: Directions = Directions.North

	return {
		_enter() {
			const actor = turn.actor!
			startDir = actor.dir
			selectTile(owner, actor.tile!.pos)
		},
		move(direction: Point) {
			const actor = turn.actor!
			actor.dir = getDirection(direction)
			actor.match()
		},
		fire(button: number) {
			const actor = turn.actor!
			switch (button) {
				case 0:
					return "SelectUnitState"
				case 1:
					actor.dir = startDir
					actor.match()
					return "CommandSelectionState"
			}
		}
	} satisfies BattleStateHandlers
}
