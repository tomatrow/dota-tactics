import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Point } from "#lib/model/Point.ts"
import { selectTile, type BattleStateHandlers, type BattleStateName } from "./BattleState.ts"

/** The abstract methods of `BaseAbilityMenuState`, which each menu state implements. */
export interface AbilityMenu {
	loadMenu(): void
	confirm(): BattleStateName | void
	cancel(): BattleStateName | void
}

/**
 * Port of `Controller/Battle States/BaseAbilityMenuState.cs`: what the three menu states share.
 * They spread these handlers into their own.
 */
export function baseAbilityMenuState(owner: BattleController, menu: AbilityMenu) {
	return {
		_enter() {
			selectTile(owner, owner.turn.actor!.tile!.pos)
			// TODO(part 24): only for human drivers.
			menu.loadMenu()
		},
		_exit() {
			owner.abilityMenuPanelController.hide()
		},
		fire(button: number) {
			return button === 0 ? menu.confirm() : menu.cancel()
		},
		move(direction: Point) {
			if (direction.x > 0 || direction.y < 0) owner.abilityMenuPanelController.next()
			else owner.abilityMenuPanelController.previous()
		}
	} satisfies BattleStateHandlers
}
