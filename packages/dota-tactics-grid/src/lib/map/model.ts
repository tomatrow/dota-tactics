import type { DotaMap, MapEntity, MapLayers } from "./schema.ts"

/** Tiles within this distance (game units) of a lane's path are drawn as road. */
export const LANE_RADIUS = 192
/** Walkable tiles whose ground varies this much (game units) inside them are drawn as ramps. */
export const RAMP_RANGE = 64
/** Width (game units) of the blend between the two sides around the halfway line. */
const SIDE_BLEND = 2400

const smoothstep = (t: number) => {
	const c = Math.min(1, Math.max(0, t))
	return c * c * (3 - 2 * c)
}

/**
 * The map as flat, row-major typed arrays (index = row * cols + col, row 0 = south), plus what the
 * viewer derives from it: which side each tile is on and which tiles are lane road.
 */
export class MapModel {
	readonly cols: number
	readonly rows: number
	readonly count: number
	/** Tile edge in game units. */
	readonly cell: number
	readonly originX: number
	readonly originY: number
	/** Ground height in game units; NaN where there's no ground. */
	readonly height: Float32Array
	readonly heightRange: Float32Array
	/** Height level; NaN where there's no ground. */
	readonly level: Float32Array
	readonly walkable: Uint8Array
	readonly water: Uint8Array
	readonly tree: Uint8Array
	readonly gnv: Uint8Array
	/** 0 = Radiant … 1 = Dire, blended around the halfway line between the Ancients. */
	readonly side: Float32Array
	/** 1 where a tile is walkable lane road. */
	readonly lane: Uint8Array
	readonly minHeight: number
	readonly maxHeight: number
	readonly entitiesByTile: Map<number, MapEntity[]>
	/** Tree positions as `"x,y"`. */
	readonly treeAt: Set<string>

	readonly data: DotaMap

	constructor(data: DotaMap) {
		this.data = data
		const { cols, rows, cell, origin } = data.grid
		this.cols = cols
		this.rows = rows
		this.count = cols * rows
		this.cell = cell
		this.originX = origin[0]
		this.originY = origin[1]

		const flat = <T extends Float32Array | Uint8Array>(name: keyof MapLayers, out: T): T => {
			const layer = data.layers[name]
			for (let r = 0; r < rows; r++) {
				const row = layer[r]
				for (let c = 0; c < cols; c++) out[r * cols + c] = row[c] ?? Number.NaN
			}
			return out
		}
		this.height = flat("height", new Float32Array(this.count))
		this.heightRange = flat("heightRange", new Float32Array(this.count))
		this.level = flat("level", new Float32Array(this.count))
		this.walkable = flat("walkable", new Uint8Array(this.count))
		this.water = flat("water", new Uint8Array(this.count))
		this.tree = flat("tree", new Uint8Array(this.count))
		this.gnv = flat("gnv", new Uint8Array(this.count))

		let lo = Infinity
		let hi = -Infinity
		for (const h of this.height) {
			if (h < lo) lo = h
			if (h > hi) hi = h
		}
		this.minHeight = Number.isFinite(lo) ? lo : 0
		this.maxHeight = Number.isFinite(hi) ? hi : 0

		this.side = this.computeSides()
		this.lane = this.computeLanes()
		this.treeAt = new Set(data.trees.map(([x, y]) => `${String(x)},${String(y)}`))
		this.entitiesByTile = new Map()
		for (const entity of data.entities) {
			if (!entity.cell) continue
			const i = this.index(entity.cell[0], entity.cell[1])
			const list = this.entitiesByTile.get(i)
			if (list) list.push(entity)
			else this.entitiesByTile.set(i, [entity])
		}
	}

	index(col: number, row: number): number {
		return row * this.cols + col
	}

	inside(col: number, row: number): boolean {
		return col >= 0 && row >= 0 && col < this.cols && row < this.rows
	}

	/** The tile containing a point; tiles are half-open, `[x0, x0 + cell)`. */
	cellOf(x: number, y: number): [col: number, row: number] | null {
		const col = Math.floor((x - this.originX) / this.cell)
		const row = Math.floor((y - this.originY) / this.cell)
		return this.inside(col, row) ? [col, row] : null
	}

	tileCentre(col: number, row: number): [x: number, y: number] {
		return [this.originX + (col + 0.5) * this.cell, this.originY + (row + 0.5) * this.cell]
	}

	hasGround(i: number): boolean {
		return !Number.isNaN(this.height[i])
	}

	/** Side at a point: 0 = Radiant, 1 = Dire. */
	sideAt(x: number, y: number): number {
		const radiant = this.ancient("radiant")
		const dire = this.ancient("dire")
		if (!radiant || !dire) {
			// No Ancients: fall back to the map's diagonal, Radiant south-west.
			return smoothstep(0.5 + (x + y) / (2 * SIDE_BLEND))
		}
		const dr = Math.hypot(x - radiant.x, y - radiant.y)
		const dd = Math.hypot(x - dire.x, y - dire.y)
		return smoothstep(0.5 + (dr - dd) / SIDE_BLEND)
	}

	ancient(team: "radiant" | "dire"): MapEntity | undefined {
		return this.data.entities.find((e) => e.kind === "ancient" && e.team === team)
	}

	private computeSides(): Float32Array {
		const side = new Float32Array(this.count)
		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.cols; c++) {
				const [x, y] = this.tileCentre(c, r)
				side[this.index(c, r)] = this.sideAt(x, y)
			}
		}
		return side
	}

	private computeLanes(): Uint8Array {
		const lane = new Uint8Array(this.count)
		const reach = Math.ceil(LANE_RADIUS / this.cell) + 1
		for (const { points } of this.data.lanes) {
			for (let s = 0; s + 1 < points.length; s++) {
				const [ax, ay] = points[s]
				const [bx, by] = points[s + 1]
				const a = this.cellOf(Math.min(ax, bx), Math.min(ay, by)) ?? [0, 0]
				const b = this.cellOf(Math.max(ax, bx), Math.max(ay, by)) ?? [this.cols - 1, this.rows - 1]
				for (let r = Math.max(0, a[1] - reach); r <= Math.min(this.rows - 1, b[1] + reach); r++) {
					for (let c = Math.max(0, a[0] - reach); c <= Math.min(this.cols - 1, b[0] + reach); c++) {
						const i = this.index(c, r)
						if (lane[i] || !this.walkable[i] || this.water[i]) continue
						const [x, y] = this.tileCentre(c, r)
						if (segmentDistance(x, y, ax, ay, bx, by) <= LANE_RADIUS) lane[i] = 1
					}
				}
			}
		}
		return lane
	}
}

export function segmentDistance(
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number
): number {
	const dx = bx - ax
	const dy = by - ay
	const lengthSq = dx * dx + dy * dy
	const t = lengthSq ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0
	return Math.hypot(ax + t * dx - px, ay + t * dy - py)
}

/** Names of the GridNav flags set in `value`, using the legend in `meta.gnvFlags`. */
export function gnvFlagNames(value: number, flags: Record<string, number>): string[] {
	return Object.entries(flags)
		.filter(([, bit]) => (value & bit) !== 0)
		.map(([name]) => name)
}
