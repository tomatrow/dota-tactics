import type { Point } from "#lib/model/Point.ts"
import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { AbilityArea } from "./AbilityArea.ts"

/**
 * Port of `View Model Component/Ability/Area Of Effect/SpecifyAbilityArea.cs`: the tiles within
 * `horizontal` steps of the aimed tile, and within `vertical` of its height.
 */
export class SpecifyAbilityArea extends AbilityArea {
	horizontal: number
	vertical: number
	#tile: Tile | null = null

	constructor({ horizontal = 0, vertical = 0 }: { horizontal?: number; vertical?: number } = {}) {
		super()
		this.horizontal = horizontal
		this.vertical = vertical
	}

	override getTilesInArea(board: Board, pos: Point): Tile[] {
		this.#tile = board.getTile(pos)
		return board.search(this.#tile!, this.#expandSearch)
	}

	readonly #expandSearch = (from: Tile, to: Tile): boolean =>
		from.distance + 1 <= this.horizontal &&
		Math.abs(to.height - this.#tile!.height) <= this.vertical
}
