import { SvelteMap } from "svelte/reactivity"
import type { LevelData } from "#lib/model/LevelData.ts"
import { Point } from "#lib/model/Point.ts"
import { Tile } from "./Tile.svelte.ts"

/** Port of `View Model Component/Board.cs`: the tiles of the battlefield, keyed by position. */
export class Board {
	readonly tiles = new SvelteMap<Point, Tile>()

	#min = Point.of(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
	#max = Point.of(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER)

	readonly #dirs = [Point.of(0, 1), Point.of(0, -1), Point.of(1, 0), Point.of(-1, 0)]

	readonly selectedTileColor = "#00ffff"
	readonly defaultTileColor = "#ffffff"

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

	/**
	 * Breadth-first search from `start`, expanding from tile to neighbouring tile while
	 * `addTile(from, to)` allows it. Returns `start` and every tile reached, and leaves each
	 * reached tile's `prev`/`distance` describing its shortest path back to `start`.
	 */
	search(start: Tile, addTile: (from: Tile, to: Tile) => boolean): Tile[] {
		const retValue = [start]

		this.#clearSearch()
		let checkNext: Tile[] = []
		let checkNow: Tile[] = []

		start.distance = 0
		checkNow.push(start)

		while (checkNow.length > 0) {
			const t = checkNow.shift()!
			for (const dir of this.#dirs) {
				const next = this.getTile(t.pos.add(dir))
				if (next === null || next.distance <= t.distance + 1) continue

				if (addTile(t, next)) {
					next.distance = t.distance + 1
					next.prev = t
					checkNext.push(next)
					retValue.push(next)
				}
			}

			if (checkNow.length === 0) [checkNow, checkNext] = [checkNext, checkNow]
		}

		return retValue
	}

	selectTiles(tiles: Tile[]): void {
		for (let i = tiles.length - 1; i >= 0; --i) tiles[i]!.color = this.selectedTileColor
	}

	deSelectTiles(tiles: Tile[]): void {
		for (let i = tiles.length - 1; i >= 0; --i) tiles[i]!.color = this.defaultTileColor
	}

	#clearSearch(): void {
		for (const t of this.tiles.values()) {
			t.prev = null
			// Unity's int.MaxValue.
			t.distance = Number.MAX_SAFE_INTEGER
		}
	}
}
