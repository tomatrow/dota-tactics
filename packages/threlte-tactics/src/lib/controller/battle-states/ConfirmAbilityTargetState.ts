import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Point } from "#lib/model/Point.ts"
import type { AbilityEffectTarget } from "#lib/view-model-component/ability/effect-target/AbilityEffectTarget.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import {
	refreshPrimaryStatPanel,
	refreshSecondaryStatPanel,
	type BattleStateHandlers
} from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/ConfirmAbilityTargetState.cs`: shows the area the aimed
 * ability affects and the targets in it; moving cycles the secondary stat panel and the hit
 * success indicator through them.
 */
// TODO(part 24): the computer confirms.
export function confirmAbilityTargetState(owner: BattleController) {
	const { board, statPanelController, hitSuccessIndicator, turn } = owner
	let tiles: Tile[] = []
	let index = 0

	// TODO(part 20): `turn.ability.isTarget`.
	function findTargets(): void {
		turn.targets = []
		const targeters = turn.ability!.effects.map((e) => e.target)
		for (const tile of tiles) if (isTarget(tile, targeters)) turn.targets.push(tile)
	}

	function isTarget(tile: Tile, list: AbilityEffectTarget[]): boolean {
		for (const targeter of list) if (targeter.isTarget(tile)) return true

		return false
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

	return {
		_enter() {
			tiles = turn.ability!.area.getTilesInArea(board, owner.pos)
			board.selectTiles(tiles)
			findTargets()
			refreshPrimaryStatPanel(owner, turn.actor!.tile!.pos)
			if (turn.targets.length > 0) {
				hitSuccessIndicator.show()
				setTarget(0)
			}
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
		}
	} satisfies BattleStateHandlers
}
