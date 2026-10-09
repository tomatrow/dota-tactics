import { wait } from "#lib/common/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { Drivers } from "#lib/enums/Drivers.ts"
import type { Point } from "#lib/model/Point.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import {
	driver,
	refreshPrimaryStatPanel,
	refreshSecondaryStatPanel,
	type BattleStateHandlers
} from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/ConfirmAbilityTargetState.cs`: shows the area the aimed
 * ability affects and the targets in it; moving cycles the secondary stat panel and the hit
 * success indicator through them. The computer shows the ability's name instead, then uses it.
 */
export function confirmAbilityTargetState(owner: BattleController) {
	const { board, statPanelController, hitSuccessIndicator, turn } = owner
	let tiles: Tile[] = []
	let index = 0

	function findTargets(): void {
		turn.targets = []
		for (const tile of tiles) if (turn.ability!.isTarget(tile)) turn.targets.push(tile)
	}

	function setTarget(target: number): void {
		index = target
		if (index < 0) index = turn.targets.length - 1
		if (index >= turn.targets.length) index = 0

		if (turn.targets.length > 0) {
			refreshSecondaryStatPanel(owner, turn.targets[index]!.pos)
			updateHitSuccessIndicator()
		}
	}

	function updateHitSuccessIndicator(): void {
		let chance = 0
		let amount = 0
		const target = turn.targets[index]!

		for (const child of turn.ability!.effects) {
			if (child.target.isTarget(target)) {
				chance = child.hitRate.calculate(target)
				amount = child.effect.predict(target)
				break
			}
		}

		hitSuccessIndicator.setStats(chance, amount)
	}

	async function computerDisplayAbilitySelection(): Promise<void> {
		owner.battleMessageController.display(turn.ability!.name)
		await wait(2)
		owner.machine.done()
	}

	return {
		_enter() {
			tiles = turn.ability!.area.getTilesInArea(board, owner.pos)
			board.selectTiles(tiles)
			findTargets()
			refreshPrimaryStatPanel(owner, turn.actor!.tile!.pos)
			if (turn.targets.length > 0) {
				// Only show this UI for Human controlled units
				if (driver(owner)!.current === Drivers.Human) hitSuccessIndicator.show()
				setTarget(0)
			}

			// Only show this UI for AI controlled units
			if (driver(owner)!.current === Drivers.Computer) void computerDisplayAbilitySelection()
		},
		_exit() {
			board.deSelectTiles(tiles)
			statPanelController.hidePrimary()
			statPanelController.hideSecondary()
			hitSuccessIndicator.hide()
		},
		move(direction: Point) {
			if (direction.y > 0 || direction.x > 0) setTarget(index + 1)
			else setTarget(index - 1)
		},
		fire(button: number) {
			if (button === 0) {
				if (turn.targets.length > 0) return "PerformAbilityState"
			} else {
				return "AbilityTargetState"
			}
		},
		done: () => "PerformAbilityState"
	} satisfies BattleStateHandlers
}
