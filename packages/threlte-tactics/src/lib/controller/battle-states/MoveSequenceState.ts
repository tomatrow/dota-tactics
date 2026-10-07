import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { BattleStateHandlers } from "./BattleState.ts"

/** Port of `Controller/Battle States/MoveSequenceState.cs`: animates the move; no input. */
export function moveSequenceState(owner: BattleController) {
	async function sequence(): Promise<void> {
		const m = owner.currentUnit!.movement!
		await m.traverse(owner.currentTile!)
		owner.machine.done()
	}

	return {
		_enter() {
			void sequence()
		},
		done: () => "SelectUnitState"
	} satisfies BattleStateHandlers
}
