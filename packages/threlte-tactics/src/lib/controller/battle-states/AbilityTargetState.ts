import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { getDirection } from "#lib/extensions/DirectionsExtensions.ts"
import type { Point } from "#lib/model/Point.ts"
import type { AbilityRange } from "#lib/view-model-component/ability/range/AbilityRange.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { refreshSecondaryStatPanel, selectTile, type BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/AbilityTargetState.cs`: shows the ability's range. The player
 * aims by moving the cursor within it, or, for direction oriented ranges, by turning the actor.
 */
// TODO(part 24): the computer aims.
export function abilityTargetState(owner: BattleController) {
	const { board, statPanelController, turn } = owner
	let tiles: Tile[] = []
	let ar!: AbilityRange

	function changeDirection(p: Point): void {
		const actor = turn.actor!
		const dir = getDirection(p)
		if (actor.dir !== dir) {
			board.deSelectTiles(tiles)
			actor.dir = dir
			actor.match()
			selectTiles()
		}
	}

	function selectTiles(): void {
		tiles = ar.getTilesInRange(board)
		board.selectTiles(tiles)
	}

	return {
		_enter() {
			ar = turn.ability!.range
			selectTiles()
			statPanelController.showPrimary(turn.actor!)
			if (ar.directionOriented) refreshSecondaryStatPanel(owner, owner.pos)
		},
		_exit() {
			board.deSelectTiles(tiles)
			statPanelController.hidePrimary()
			statPanelController.hideSecondary()
		},
		move(direction: Point) {
			if (ar.directionOriented) {
				changeDirection(direction)
			} else {
				selectTile(owner, direction.add(owner.pos))
				refreshSecondaryStatPanel(owner, owner.pos)
			}
		},
		fire(button: number) {
			if (button === 0) {
				// TODO(part 15): confirm the targets (`ConfirmAbilityTargetState`) first.
				turn.hasUnitActed = true
				if (turn.hasUnitMoved) turn.lockMove = true
				return "CommandSelectionState"
			} else {
				return "CategorySelectionState"
			}
		}
	} satisfies BattleStateHandlers
}
