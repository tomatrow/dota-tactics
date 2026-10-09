import { wait } from "#lib/common/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { Drivers } from "#lib/enums/Drivers.ts"
import { baseAbilityMenuState } from "./BaseAbilityMenuState.ts"
import { driver, selectTile, type BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/CommandSelectionState.cs`: the turn's top menu (Move, Action,
 * Wait). Cancelling undoes a move, or explores the board. On the computer's turn there's no menu:
 * the computer plans the turn, then carries out the next step of the plan.
 */
export function commandSelectionState(owner: BattleController) {
	const { abilityMenuPanelController: menu, turn } = owner
	let menuTitle = ""
	let menuOptions: string[] | null = null

	const base = baseAbilityMenuState(owner, {
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
					return "EndFacingState"
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

	async function computerTurn(): Promise<void> {
		if (turn.plan === null) {
			turn.plan = owner.cpu.evaluate()
			turn.ability = turn.plan.ability
		}

		await wait(1)
		owner.machine.done()
	}

	return {
		...base,
		_enter() {
			base._enter()
			owner.statPanelController.showPrimary(turn.actor!)
			if (driver(owner)!.current === Drivers.Computer) void computerTurn()
		},
		_exit() {
			base._exit()
			owner.statPanelController.hidePrimary()
		},
		done() {
			const plan = turn.plan!
			if (!turn.hasUnitMoved && plan.moveLocation !== turn.actor!.tile!.pos)
				return "MoveTargetState"
			else if (!turn.hasUnitActed && plan.ability !== null) return "AbilityTargetState"
			else return "EndFacingState"
		}
	} satisfies BattleStateHandlers
}
