import { linear, quadOut } from "svelte/easing"
import { nextFrame } from "#lib/common/time.ts"
import { getDirection } from "#lib/extensions/DirectionsExtensions.ts"
import { Tile } from "../Tile.svelte.ts"
import { Movement } from "./Movement.ts"

/** Port of `View Model Component/Movement/WalkMovement.cs`: walks, and jumps small ledges. */
export class WalkMovement extends Movement {
	protected override expandSearch(from: Tile, to: Tile): boolean {
		// Skip if the distance in height between the two tiles is more than the unit can jump
		if (Math.abs(from.height - to.height) > this.jumpHeight) return false

		// Skip if the tile is occupied by an enemy
		if (to.content !== null) return false

		return super.expandSearch(from, to)
	}

	override async traverse(tile: Tile): Promise<void> {
		this.unit.place(tile)

		// Build a list of way points from the unit's
		// starting tile to the destination tile
		const targets: Tile[] = []
		for (let t: Tile | null = tile; t !== null; t = t.prev) targets.unshift(t)

		// Move to each way point in succession
		for (let i = 1; i < targets.length; ++i) {
			const from = targets[i - 1]!
			const to = targets[i]!

			const dir = getDirection(from, to)
			if (this.unit.dir !== dir) await this.turn(dir)

			if (from.height === to.height) await this.#walk(to)
			else await this.#jump(to)
		}

		await nextFrame()
	}

	#walk(target: Tile): Promise<void> {
		return this.unit.transform.moveTo(target.center, 0.5, linear)
	}

	async #jump(to: Tile): Promise<void> {
		const duration = 0.5
		const tweener = this.unit.transform.moveTo(to.center, duration, linear)
		void this.jumper.moveTo([0, Tile.stepHeight * 2, 0], duration / 2, quadOut, {
			loopCount: 1,
			loopType: "PingPong"
		})
		await tweener
	}
}
