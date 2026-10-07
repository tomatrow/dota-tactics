import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Point } from "#lib/model/Point.ts"
import { refreshPrimaryStatPanel, selectTile, type BattleStateHandlers } from "./BattleState.ts"

/** Port of `Controller/Battle States/ExploreState.cs`: look around the board, then confirm. */
export function exploreState(owner: BattleController) {
	return {
		_enter() {
			refreshPrimaryStatPanel(owner, owner.pos)
		},
		_exit() {
			owner.statPanelController.hidePrimary()
		},
		move(direction: Point) {
			selectTile(owner, direction.add(owner.pos))
			refreshPrimaryStatPanel(owner, owner.pos)
		},
		fire(button: number) {
			if (button === 0) return "CommandSelectionState"
		}
	} satisfies BattleStateHandlers
}
