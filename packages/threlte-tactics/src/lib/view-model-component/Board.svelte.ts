import { SvelteMap } from "svelte/reactivity"
import type { LevelData } from "#lib/model/LevelData.ts"
import { Point } from "#lib/model/Point.ts"
import { Tile } from "./Tile.svelte.ts"

/** Port of `View Model Component/Board.cs`: the tiles of the battlefield, keyed by position. */
export class Board {
	readonly tiles = new SvelteMap<Point, Tile>()

	#min = Point.of(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
	#max = Point.of(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER)

	get min(): Point {
		return this.#min
	}

	get max(): Point {
		return this.#max
	}

	load(data: LevelData): void {
		let minX = Number.MAX_SAFE_INTEGER
		let minY = Number.MAX_SAFE_INTEGER
		let maxX = Number.MIN_SAFE_INTEGER
		let maxY = Number.MIN_SAFE_INTEGER

		for (const v of data.tiles) {
			const t = new Tile()
			t.load(v)
			// Like Unity's Dictionary.Add.
			if (this.tiles.has(t.pos)) throw new Error(`Duplicate tile at ${t.pos}`)
			this.tiles.set(t.pos, t)

			minX = Math.min(minX, t.pos.x)
			minY = Math.min(minY, t.pos.y)
			maxX = Math.max(maxX, t.pos.x)
			maxY = Math.max(maxY, t.pos.y)
		}

		this.#min = Point.of(minX, minY)
		this.#max = Point.of(maxX, maxY)
	}

	getTile(p: Point): Tile | null {
		return this.tiles.get(p) ?? null
	}
}
