import type { Vector3 } from "#lib/common/vector.ts"
import { Point } from "#lib/model/Point.ts"
import type { Unit } from "./Unit.svelte.ts"

/**
 * Port of `View Model Component/Tile.cs`: one column of the board. Where board space (`pos`,
 * `height`) meets world space: board `x` is world X, board `y` is world −Z (North is −Z), and a
 * step of height is `stepHeight` up.
 */
export class Tile {
	/** Four steps are as tall as a tile is wide. */
	static readonly stepHeight = 0.25

	pos = $state.raw(Point.zero)
	height = $state(0)
	/** What stands on the tile (only units do). */
	content: Unit | null = null
	/** Pathfinding: the tile the last `Board.search` reached this one from. */
	prev: Tile | null = null
	/** Pathfinding: how many steps the last `Board.search` took to reach this tile. */
	distance = 0
	/** The tile's color, which `Board` changes to highlight it. */
	color = $state("#ffffff")

	/** The middle of the top of the tile, where units stand. */
	get center(): Vector3 {
		return [this.pos.x, this.height * Tile.stepHeight, -this.pos.y]
	}

	/** The middle of the tile's column. */
	get position(): Vector3 {
		return [this.pos.x, (this.height * Tile.stepHeight) / 2, -this.pos.y]
	}

	/** The size of the tile's column (a unit cube, scaled). */
	get scale(): Vector3 {
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
