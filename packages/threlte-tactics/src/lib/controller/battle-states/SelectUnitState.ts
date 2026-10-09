import { nextFrame } from "#lib/common/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { refreshPrimaryStatPanel, selectTile, type BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/SelectUnitState.cs`: the turn order's next round step picks
 * the actor; its command menu opens a frame later.
 */
export function selectUnitState(owner: BattleController) {
	async function changeCurrentUnit(): Promise<void> {
		owner.round!.next()
		selectTile(owner, owner.turn.actor!.tile!.pos)
		refreshPrimaryStatPanel(owner, owner.pos)
		await nextFrame()
		owner.machine.done()
	}

	return {
		_enter() {
			void changeCurrentUnit()
		},
		_exit() {
			owner.statPanelController.hidePrimary()
		},
		done: () => "CommandSelectionState"
	} satisfies BattleStateHandlers
}
