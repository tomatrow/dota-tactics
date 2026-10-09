import { wait } from "#lib/common/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { Drivers } from "#lib/enums/Drivers.ts"
import { Point } from "#lib/model/Point.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import {
	driver,
	refreshPrimaryStatPanel,
	selectTile,
	type BattleStateHandlers
} from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/MoveTargetState.cs`: the player picks where to move. The
 * computer moves the cursor to where it plans to, a step at a time.
 */
export function moveTargetState(owner: BattleController) {
	let tiles: Tile[] = []

	async function computerHighlightMoveTarget(): Promise<void> {
		const { moveLocation } = owner.turn.plan!
		let cursorPos = owner.pos
		while (cursorPos !== moveLocation) {
			let { x, y } = cursorPos
			if (x < moveLocation.x) x++
			if (x > moveLocation.x) x--
			if (y < moveLocation.y) y++
			if (y > moveLocation.y) y--
			cursorPos = Point.of(x, y)
			selectTile(owner, cursorPos)
			await wait(0.25)
		}
		await wait(0.5)
		owner.machine.done()
	}

	return {
		_enter() {
			const mover = owner.turn.actor!.movement!
			tiles = mover.getTilesInRange(owner.board)
			owner.board.selectTiles(tiles)
			refreshPrimaryStatPanel(owner, owner.pos)
			if (driver(owner)!.current === Drivers.Computer) void computerHighlightMoveTarget()
		},
		_exit() {
			owner.board.deSelectTiles(tiles)
			tiles = []
			owner.statPanelController.hidePrimary()
		},
		move(direction: Point) {
			selectTile(owner, direction.add(owner.pos))
			refreshPrimaryStatPanel(owner, owner.pos)
		},
		fire(button: number) {
			if (button === 0) {
				if (tiles.includes(owner.currentTile!)) return "MoveSequenceState"
			} else {
				return "CommandSelectionState"
			}
		},
		done: () => "MoveSequenceState"
	} satisfies BattleStateHandlers
}
