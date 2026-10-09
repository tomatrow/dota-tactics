import { quadInOut } from "svelte/easing"
import { MathUtils } from "three"
import type { Transform } from "#lib/common/Transform.svelte.ts"
import type { Directions } from "#lib/enums/Directions.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { toYaw } from "#lib/extensions/DirectionsExtensions.ts"
import type { Stats } from "../actor/Stats.ts"
import type { Board } from "../Board.svelte.ts"
import type { Tile } from "../Tile.svelte.ts"
import type { Unit } from "../Unit.svelte.ts"

/** Port of `View Model Component/Movement/Movement.cs`: how a unit gets around the board. */
export abstract class Movement {
	protected readonly unit: Unit
	protected readonly jumper: Transform
	protected readonly stats: Stats

	/** Unity's `Awake` + `Start`. */
	constructor(unit: Unit) {
		this.unit = unit
		this.jumper = unit.jumper
		this.stats = unit.stats
	}

	/** How many tiles the unit can move. */
	get range(): number {
		return this.stats.get(StatTypes.MOV)
	}

	/** How many steps up or down the unit can jump. */
	get jumpHeight(): number {
		return this.stats.get(StatTypes.JMP)
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

	/** Turns the short way round to face `dir`. */
	protected async turn(dir: Directions): Promise<void> {
		const start = this.unit.transform.yaw
		const delta = MathUtils.euclideanModulo(toYaw(dir) - start + Math.PI, 2 * Math.PI) - Math.PI
		const t = this.unit.transform.rotateTo(start + delta, 0.25, quadInOut)
		this.unit.dir = dir
		await t
	}
}
