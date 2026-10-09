import { wait } from "#lib/common/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { Drivers } from "#lib/enums/Drivers.ts"
import { getDirection, getNormal } from "#lib/extensions/DirectionsExtensions.ts"
import { Point } from "#lib/model/Point.ts"
import type { AbilityRange } from "#lib/view-model-component/ability/range/AbilityRange.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import {
	driver,
	refreshSecondaryStatPanel,
	selectTile,
	type BattleStateHandlers
} from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/AbilityTargetState.cs`: shows the ability's range. The player
 * aims by moving the cursor within it, or, for direction oriented ranges, by turning the actor.
 * The computer does the same, where it plans to.
 */
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

	async function computerHighlightTarget(): Promise<void> {
		const plan = turn.plan!
		if (ar.directionOriented) {
			changeDirection(getNormal(plan.attackDirection))
			await wait(0.25)
		} else {
			const { fireLocation } = plan
			let cursorPos = owner.pos
			while (cursorPos !== fireLocation) {
				let { x, y } = cursorPos
				if (x < fireLocation.x) x++
				if (x > fireLocation.x) x--
				if (y < fireLocation.y) y++
				if (y > fireLocation.y) y--
				cursorPos = Point.of(x, y)
				selectTile(owner, cursorPos)
				await wait(0.25)
			}
		}
		await wait(0.5)
		owner.machine.done()
	}

	return {
		_enter() {
			ar = turn.ability!.range
			selectTiles()
			statPanelController.showPrimary(turn.actor!)
			if (ar.directionOriented) refreshSecondaryStatPanel(owner, owner.pos)
			if (driver(owner)!.current === Drivers.Computer) void computerHighlightTarget()
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
				if (ar.directionOriented || tiles.includes(owner.currentTile!))
					return "ConfirmAbilityTargetState"
			} else {
				return "CategorySelectionState"
			}
		},
		done: () => "ConfirmAbilityTargetState"
	} satisfies BattleStateHandlers
}
