import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { baseAbilityMenuState } from "./BaseAbilityMenuState.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/CommandSelectionState.cs`: the turn's top menu (Move, Action,
 * Wait). Cancelling undoes a move, or explores the board.
 */
// TODO(part 13): show the actor's stat panel. TODO(part 24): the computer's turn.
export function commandSelectionState(owner: BattleController) {
	const { abilityMenuPanelController: menu, turn } = owner
	let menuTitle = ""
	let menuOptions: string[] | null = null

	return {
		...baseAbilityMenuState(owner, {
			loadMenu() {
				if (menuOptions === null) {
					menuTitle = "Commands"
					menuOptions = ["Move", "Action", "Wait"]
				}

				menu.show(menuTitle, menuOptions)
				menu.setLocked(0, turn.hasUnitMoved)
				menu.setLocked(1, turn.hasUnitActed)
			},
			confirm() {
				switch (menu.selection) {
					case 0: // Move
						return "MoveTargetState"
					case 1: // Action
						return "CategorySelectionState"
					case 2: // Wait
						// TODO(part 16): `EndFacingState`.
						return "SelectUnitState"
				}
			},
			cancel() {
				if (turn.hasUnitMoved && !turn.lockMove) {
					turn.undoMove()
					menu.setLocked(0, false)
					selectTile(owner, turn.actor!.tile!.pos)
				} else {
					return "ExploreState"
				}
			}
		})
	} satisfies BattleStateHandlers
}
