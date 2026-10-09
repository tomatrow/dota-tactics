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
		// The jumper's world height: the unit's plus the jumper's own.
		const jumperY = this.unit.transform.position[1] + this.jumper.position[1]
		let duration = (y - jumperY) * 0.5
		await this.jumper.moveTo([0, y, 0], duration, quadInOut)

		// Turn to face the general direction
		let dir: Directions
		const [dx, dy] = [tile.pos.x - from.x, tile.pos.y - from.y]
		if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? Directions.East : Directions.West
		else dir = dy > 0 ? Directions.North : Directions.South
		await this.turn(dir)

		// Move to the correct position
		duration = dist * 0.5
		await this.unit.transform.moveTo(tile.center, duration, quadInOut)

		// Land
		await this.jumper.moveTo([0, 0, 0], 0.5, quadInOut)
	}
}
