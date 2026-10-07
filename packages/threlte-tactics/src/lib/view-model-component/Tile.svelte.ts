import type { Vector3 } from "#lib/common/unity/vector3.ts"
import { Point } from "#lib/model/Point.ts"
import type { Unit } from "./Unit.svelte.ts"

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
	/** What stands on the tile. Unity's is a `GameObject`; only units ever stand on tiles. */
	content: Unit | null = null
	/** Pathfinding: the tile the last `Board.search` reached this one from. */
	prev: Tile | null = null
	/** Pathfinding: how many steps the last `Board.search` took to reach this tile. */
	distance = 0
	/** Its renderer's material color (Unity's `_Color`), which `Board` uses to highlight tiles. */
	color = $state("#ffffff")

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
