import { Directions } from "#lib/enums/Directions.ts"
import { Point } from "#lib/model/Point.ts"
import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { AbilityRange } from "./AbilityRange.ts"

/**
 * Port of `View Model Component/Ability/Range/ConeAbilityRange.cs`: a cone spreading out in front
 * of the user, `horizontal` rows deep, each row two tiles wider than the last (1, 3, 5…).
 */
export class ConeAbilityRange extends AbilityRange {
	override get directionOriented(): boolean {
		return true
	}

	override getTilesInRange(board: Board): Tile[] {
		const pos = this.unit.tile!.pos
		const retValue: Tile[] = []
		const unitDir = this.unit.dir
		const dir = unitDir === Directions.North || unitDir === Directions.East ? 1 : -1
		let lateral = 1

		if (unitDir === Directions.North || unitDir === Directions.South) {
			for (let y = 1; y <= this.horizontal; ++y) {
				const min = -Math.trunc(lateral / 2)
				const max = Math.trunc(lateral / 2)
				for (let x = min; x <= max; ++x) {
					const next = Point.of(pos.x + x, pos.y + y * dir)
					const tile = board.getTile(next)
					if (this.#validTile(tile)) retValue.push(tile)
				}
				lateral += 2
			}
		} else {
			for (let x = 1; x <= this.horizontal; ++x) {
				const min = -Math.trunc(lateral / 2)
				const max = Math.trunc(lateral / 2)
				for (let y = min; y <= max; ++y) {
					const next = Point.of(pos.x + x * dir, pos.y + y)
					const tile = board.getTile(next)
					if (this.#validTile(tile)) retValue.push(tile)
				}
				lateral += 2
			}
		}

		return retValue
	}

	#validTile(t: Tile | null): t is Tile {
		return t !== null && Math.abs(t.height - this.unit.tile!.height) <= this.vertical
	}
}
