import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { baseAbilityMenuState } from "./BaseAbilityMenuState.ts"
import type { BattleStateHandlers, BattleStateName } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/CategorySelectionState.cs`: Attack, or one of the categories
 * in the actor's ability catalog.
 */
export function categorySelectionState(owner: BattleController) {
	const { abilityMenuPanelController: menu, turn } = owner
	let menuTitle = ""
	const menuOptions: string[] = []

	function attack(): BattleStateName {
		turn.ability = turn.actor!.attack
		return "AbilityTargetState"
	}

	function setCategory(index: number): BattleStateName {
		owner.actionSelectionCategory = index
		return "ActionSelectionState"
	}

	const base = baseAbilityMenuState(owner, {
		loadMenu() {
			menuOptions.length = 0

			menuTitle = "Action"
			menuOptions.push("Attack")

			const catalog = turn.actor!.abilityCatalog!
			for (let i = 0; i < catalog.categoryCount(); ++i)
				menuOptions.push(catalog.getCategory(i)!.name)

			menu.show(menuTitle, menuOptions)
		},
		confirm() {
			if (menu.selection === 0) return attack()
			else return setCategory(menu.selection - 1)
		},
		cancel() {
			return "CommandSelectionState"
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
