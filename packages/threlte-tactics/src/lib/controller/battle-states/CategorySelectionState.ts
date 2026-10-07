import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { baseAbilityMenuState } from "./BaseAbilityMenuState.ts"
import type { BattleStateHandlers, BattleStateName } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/CategorySelectionState.cs` as of the ability menu part: Attack,
 * or a category of abilities.
 */
// TODO(part 13): show the actor's stat panel. TODO(part 19): the actor's ability catalog's
// categories; Attack picks a target.
export function categorySelectionState(owner: BattleController) {
	const { abilityMenuPanelController: menu, turn } = owner
	let menuTitle = ""
	let menuOptions: string[] | null = null

	function attack(): BattleStateName {
		turn.hasUnitActed = true
		if (turn.hasUnitMoved) turn.lockMove = true
		return "CommandSelectionState"
	}

	function setCategory(index: number): BattleStateName {
		owner.actionSelectionCategory = index
		return "ActionSelectionState"
	}

	return {
		...baseAbilityMenuState(owner, {
			loadMenu() {
				if (menuOptions === null) {
					menuTitle = "Action"
					menuOptions = ["Attack", "White Magic", "Black Magic"]
				}

				menu.show(menuTitle, menuOptions)
			},
			confirm() {
				switch (menu.selection) {
					case 0:
						return attack()
					case 1:
						return setCategory(0)
					case 2:
						return setCategory(1)
				}
			},
			cancel() {
				return "CommandSelectionState"
			}
		})
	} satisfies BattleStateHandlers
}
