import { waitForSeconds } from "#lib/common/unity/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { Drivers } from "#lib/enums/Drivers.ts"
import { getDirection } from "#lib/extensions/DirectionsExtensions.ts"
import type { Point } from "#lib/model/Point.ts"
import { driver, selectTile, type BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/EndFacingState.cs`: the actor picks the direction to face (the
 * facing indicator shows it), then the turn ends. Cancelling turns it back and returns to the
 * commands. The computer picks a direction for itself.
 */
export function endFacingState(owner: BattleController) {
	const { turn } = owner
	let startDir: Directions = Directions.North

	async function computerControl(): Promise<void> {
		await waitForSeconds(0.5)
		const actor = turn.actor!
		actor.dir = owner.cpu.determineEndFacingDirection()
		actor.match()
		owner.facingIndicator.setDirection(actor.dir)
		await waitForSeconds(0.5)
		owner.machine.done()
	}

	return {
		_enter() {
			const actor = turn.actor!
			startDir = actor.dir
			selectTile(owner, actor.tile!.pos)
			owner.facingIndicator.active = true
			owner.facingIndicator.setDirection(actor.dir)
			if (driver(owner)!.current === Drivers.Computer) void computerControl()
		},
		_exit() {
			owner.facingIndicator.active = false
		},
		move(direction: Point) {
			const actor = turn.actor!
			actor.dir = getDirection(direction)
			actor.match()
			owner.facingIndicator.setDirection(actor.dir)
		},
		fire(button: number) {
			const actor = turn.actor!
			switch (button) {
				case 0:
					return "SelectUnitState"
				case 1:
					actor.dir = startDir
					actor.match()
					return "CommandSelectionState"
			}
		},
		done: () => "SelectUnitState"
	} satisfies BattleStateHandlers
}
