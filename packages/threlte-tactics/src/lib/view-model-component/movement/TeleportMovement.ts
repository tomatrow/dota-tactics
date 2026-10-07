import { backIn, backOut, quadInOut } from "svelte/easing"
import type { Tile } from "../Tile.svelte.ts"
import { Movement } from "./Movement.ts"

/** Port of `View Model Component/Movement/TeleportMovement.cs`: shrinks away, grows back there. */
export class TeleportMovement extends Movement {
	override async traverse(tile: Tile): Promise<void> {
		this.unit.place(tile)

		void this.jumper.rotateToLocal([0, 360, 0], 0.5, quadInOut, {
			loopCount: 1,
			loopType: "PingPong"
		})

		await this.unit.transform.scaleTo([0, 0, 0], 0.5, backIn)

		this.unit.transform.localPosition = tile.center

		await this.unit.transform.scaleTo([1, 1, 1], 0.5, backOut)
	}
}
