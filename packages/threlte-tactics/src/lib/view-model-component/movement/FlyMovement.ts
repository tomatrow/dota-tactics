import { quadInOut } from "svelte/easing"
import { Directions } from "#lib/enums/Directions.ts"
import { Tile } from "../Tile.svelte.ts"
import { Movement } from "./Movement.ts"

/** Port of `View Model Component/Movement/FlyMovement.cs`: rises, flies straight over, lands. */
export class FlyMovement extends Movement {
	override async traverse(tile: Tile): Promise<void> {
		// Store the distance between the start tile and target tile
		const from = this.unit.tile!.pos
		const dist = Math.sqrt((tile.pos.x - from.x) ** 2 + (tile.pos.y - from.y) ** 2)
		this.unit.place(tile)

		// Fly high enough not to clip through any ground tiles
		const y = Tile.stepHeight * 10
		// Unity reads the jumper's world height: the unit's height plus the jumper's offset.
		const jumperY = this.unit.transform.localPosition[1] + this.jumper.localPosition[1]
		let duration = (y - jumperY) * 0.5
		await this.jumper.moveToLocal([0, y, 0], duration, quadInOut)

		// Turn to face the general direction
		let dir: Directions
		const [x, , z] = this.unit.transform.localPosition
		const toTile = [tile.center[0] - x, tile.center[2] - z] as const
		if (Math.abs(toTile[0]) > Math.abs(toTile[1]))
			dir = toTile[0] > 0 ? Directions.East : Directions.West
		else dir = toTile[1] > 0 ? Directions.North : Directions.South
		await this.turn(dir)

		// Move to the correct position
		duration = dist * 0.5
		await this.unit.transform.moveTo(tile.center, duration, quadInOut)

		// Land (Unity works out a duration here, then uses 0.5 regardless)
		await this.jumper.moveToLocal([0, 0, 0], 0.5, quadInOut)
	}
}
