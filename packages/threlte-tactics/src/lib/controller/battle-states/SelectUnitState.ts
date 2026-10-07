import { nextFrame } from "#lib/common/unity/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/SelectUnitState.cs` as of the ability menu part: the units
 * take turns in order.
 */
// TODO(part 16): the turn order's round picks the actor (and shows its stat panel).
export function selectUnitState(owner: BattleController) {
	let index = -1

	async function changeCurrentUnit(): Promise<void> {
		index = (index + 1) % owner.units.length
		owner.turn.change(owner.units[index]!)
		await nextFrame()
		owner.machine.done()
	}

	return {
		_enter() {
			void changeCurrentUnit()
		},
		done: () => "CommandSelectionState"
	} satisfies BattleStateHandlers
}
