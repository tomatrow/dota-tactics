import { Directions } from "#lib/enums/Directions.ts"
import { Point } from "#lib/model/Point.ts"
import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { AbilityRange } from "./AbilityRange.ts"

/**
 * Port of `View Model Component/Ability/Range/LineAbilityRange.cs`: a straight line in front of
 * the user, `horizontal` tiles long or up to the board's edge.
 */
export class LineAbilityRange extends AbilityRange {
	override get directionOriented(): boolean {
		return true
	}

	override getTilesInRange(board: Board): Tile[] {
		let startPos = this.unit.tile!.pos
		let endPos: Point
		const retValue: Tile[] = []

		switch (this.unit.dir) {
			case Directions.North:
				endPos = Point.of(startPos.x, board.max.y)
				break
			case Directions.East:
				endPos = Point.of(board.max.x, startPos.y)
				break
			case Directions.South:
				endPos = Point.of(startPos.x, board.min.y)
				break
			default: // West
				endPos = Point.of(board.min.x, startPos.y)
				break
		}

		let dist = 0
		while (startPos !== endPos) {
			let { x, y } = startPos
			if (x < endPos.x) x++
			else if (x > endPos.x) x--

			if (y < endPos.y) y++
			else if (y > endPos.y) y--
			startPos = Point.of(x, y)

			const t = board.getTile(startPos)
			if (t !== null && Math.abs(t.height - this.unit.tile!.height) <= this.vertical)
				retValue.push(t)

			dist++
			if (dist >= this.horizontal) break
		}

		return retValue
	}
}
