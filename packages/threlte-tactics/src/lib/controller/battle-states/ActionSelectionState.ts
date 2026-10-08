import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { AbilityCatalog } from "#lib/view-model-component/ability/AbilityCatalog.ts"
import { baseAbilityMenuState } from "./BaseAbilityMenuState.ts"
import type { BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/ActionSelectionState.cs`: the abilities in the category picked
 * in `CategorySelectionState` (Unity's static `category` is `owner.actionSelectionCategory`), with
 * their MP costs. Those the actor can't perform are locked.
 */
export function actionSelectionState(owner: BattleController) {
	const { abilityMenuPanelController: menu, turn } = owner
	let catalog: AbilityCatalog | null = null
	let menuTitle = ""
	const menuOptions: string[] = []

	const base = baseAbilityMenuState(owner, {
		loadMenu() {
			const category = owner.actionSelectionCategory
			catalog = turn.actor!.abilityCatalog!
			const container = catalog.getCategory(category)!
			menuTitle = container.name

			const count = catalog.abilityCount(container)
			menuOptions.length = 0

			const locks: boolean[] = []
			for (let i = 0; i < count; ++i) {
				const ability = catalog.getAbility(category, i)!
				const cost = ability.magicCost
				if (cost !== null) menuOptions.push(`${ability.name}: ${cost.amount}`)
				else menuOptions.push(ability.name)
				locks[i] = !ability.canPerform()
			}

			menu.show(menuTitle, menuOptions)
			for (let i = 0; i < count; ++i) menu.setLocked(i, locks[i]!)
		},
		confirm() {
			turn.ability = catalog!.getAbility(owner.actionSelectionCategory, menu.selection)
			return "AbilityTargetState"
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
