import type { Vector3 } from "#lib/common/unity/vector3.ts"
import { Point } from "#lib/model/Point.ts"

/**
 * Port of `View Model Component/Tile.cs`: one column of the board.
 *
 * Unity's `Match()` pushed `pos`/`height` into the tile's Transform; here the view reads
 * `localPosition`/`localScale` instead, which stay in sync on their own.
 */
export class Tile {
	/** Four steps are as tall as a tile is wide. */
	static readonly stepHeight = 0.25

	pos = $state.raw(Point.zero)
	height = $state(0)

	/** The middle of the top of the tile, where units stand. */
	get center(): Vector3 {
		return [this.pos.x, this.height * Tile.stepHeight, this.pos.y]
	}

	get localPosition(): Vector3 {
		return [this.pos.x, (this.height * Tile.stepHeight) / 2, this.pos.y]
	}

	get localScale(): Vector3 {
		return [1, this.height * Tile.stepHeight, 1]
	}

	grow(): void {
		this.height++
	}

	shrink(): void {
		this.height--
	}

	load(p: Point, h: number): void
	load(v: Vector3): void
	load(...args: [p: Point, h: number] | [v: Vector3]): void {
		if (args.length === 2) {
			this.pos = args[0]
			this.height = args[1]
		} else {
			const [x, y, z] = args[0]
			this.load(Point.of(Math.trunc(x), Math.trunc(z)), Math.trunc(y))
		}
	}
}
