import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/EndBattleState.cs`: a placeholder that starts the battle over
 * (`BattleOptions.loadLevel`).
 */
export function endBattleState(owner: BattleController) {
	return {
		_enter() {
			owner.loadLevel?.()
		}
	} satisfies BattleStateHandlers
}
