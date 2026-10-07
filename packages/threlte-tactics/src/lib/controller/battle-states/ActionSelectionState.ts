import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { baseAbilityMenuState } from "./BaseAbilityMenuState.ts"
import type { BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/ActionSelectionState.cs` as of the ability menu part: the
 * abilities in the category picked in `CategorySelectionState`.
 */
// TODO(part 20): the actor's ability catalog, with magic costs and locks; confirming picks a
// target.
export function actionSelectionState(owner: BattleController) {
	const { abilityMenuPanelController: menu, turn } = owner
	const whiteMagicOptions = ["Cure", "Raise", "Holy"]
	const blackMagicOptions = ["Fire", "Ice", "Lightning"]
	let menuTitle = ""
	const menuOptions: string[] = []

	function setOptions(options: readonly string[]): void {
		menuOptions.length = 0
		menuOptions.push(...options)
	}

	const base = baseAbilityMenuState(owner, {
		loadMenu() {
			if (owner.actionSelectionCategory === 0) {
				menuTitle = "White Magic"
				setOptions(whiteMagicOptions)
			} else {
				menuTitle = "Black Magic"
				setOptions(blackMagicOptions)
			}

			menu.show(menuTitle, menuOptions)
		},
		confirm() {
			turn.hasUnitActed = true
			if (turn.hasUnitMoved) turn.lockMove = true
			return "CommandSelectionState"
		},
		cancel() {
			return "CategorySelectionState"
		}
	})

	return {
		...base,
		_enter() {
			base._enter()
			owner.statPanelController.showPrimary(turn.actor!)
		},
		_exit() {
			base._exit()
			owner.statPanelController.hidePrimary()
		}
	} satisfies BattleStateHandlers
}
