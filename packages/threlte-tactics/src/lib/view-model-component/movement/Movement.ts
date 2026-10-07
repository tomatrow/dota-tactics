import { quadInOut } from "svelte/easing"
import { approximately } from "#lib/common/unity/mathf.ts"
import type { Transform } from "#lib/common/unity/Transform.svelte.ts"
import type { Vector3 } from "#lib/common/unity/vector3.ts"
import type { Directions } from "#lib/enums/Directions.ts"
import { toEuler } from "#lib/extensions/DirectionsExtensions.ts"
import type { Board } from "../Board.svelte.ts"
import type { Tile } from "../Tile.svelte.ts"
import type { Unit } from "../Unit.svelte.ts"

/** Port of `View Model Component/Movement/Movement.cs`: how a unit gets around the board. */
export abstract class Movement {
	// TODO(part 10/12): read from the unit's MOV and JMP stats.
	/** How many tiles the unit can move. */
	range = 0
	/** How many steps up or down the unit can jump. */
	jumpHeight = 0

	protected readonly unit: Unit
	protected readonly jumper: Transform

	constructor(unit: Unit) {
		this.unit = unit
		this.jumper = unit.jumper
	}

	getTilesInRange(board: Board): Tile[] {
		const retValue = board.search(this.unit.tile!, (from, to) => this.expandSearch(from, to))
		this.filter(retValue)
		return retValue
	}

	/** Animates the unit along the path the last search found to `tile`, and places it there. */
	abstract traverse(tile: Tile): Promise<void>

	protected expandSearch(from: Tile, _to: Tile): boolean {
		return from.distance + 1 <= this.range
	}

	/** Removes tiles the unit may pass over but not stop on. */
	protected filter(tiles: Tile[]): void {
		for (let i = tiles.length - 1; i >= 0; --i) if (tiles[i]!.content !== null) tiles.splice(i, 1)
	}

	protected async turn(dir: Directions): Promise<void> {
		let start: Vector3 = this.unit.transform.localEulerAngles
		let end = toEuler(dir)

		// When rotating between North and West, we must make an exception so it looks like the unit
		// rotates the most efficient way (since 0 and 360 are treated the same)
		if (approximately(start[1], 0) && approximately(end[1], 270)) start = [start[0], 360, start[2]]
		else if (approximately(start[1], 270) && approximately(end[1], 0))
			end = [start[0], 360, start[2]]

		const t = this.unit.transform.rotateToLocal(end, 0.25, quadInOut, { start })
		this.unit.dir = dir
		await t
	}
}
