import type { MapModel } from "#lib/map/model.ts"

/** Wall drops of at least this many game units are cliffs (stone); smaller ones are steps. */
export const CLIFF_DROP = 96
/** Height differences below this (game units) don't get a wall. */
const EPSILON = 0.5

export const PART_TOP = 0
export const PART_STEP = 1
export const PART_CLIFF = 2

/** Flat-shaded tile columns: a top quad per tile plus only the walls you can see. */
export interface ColumnMesh {
	/** Scene units at vertical scale 1 (y = game units / cell). */
	positions: Float32Array
	normals: Float32Array
	/** World-space XZ (tops) or along-wall/height (walls), in tiles. */
	uvs: Float32Array
	indices: Uint32Array
	/** The tile each vertex belongs to. */
	tile: Uint32Array
	/** PART_TOP, PART_STEP or PART_CLIFF per vertex. */
	part: Uint8Array
}

// Neighbour offsets and, for each, the wall's outward normal and corners (as [x, z] picks of the
// tile's west/east and north/south edges, CCW seen from outside).
const SIDES = [
	{ dc: 1, dr: 0, normal: [1, 0, 0], corners: ["e", "s", "e", "n"] },
	{ dc: -1, dr: 0, normal: [-1, 0, 0], corners: ["w", "n", "w", "s"] },
	{ dc: 0, dr: 1, normal: [0, 0, -1], corners: ["e", "n", "w", "n"] },
	{ dc: 0, dr: -1, normal: [0, 0, 1], corners: ["w", "s", "e", "s"] }
] as const

/**
 * @param top Column top per tile in game units, NaN for no column.
 * @param face Height a neighbouring tile presents to a wall, in game units (NaN = the floor).
 * @param floor Bottom of walls against missing tiles or the board's edge, in game units.
 */
export function buildColumns(
	model: MapModel,
	top: (i: number) => number,
	face: (i: number) => number,
	floor: number
): ColumnMesh {
	const { cols, rows, cell } = model
	const neighbourFace = (col: number, row: number) => {
		if (!model.inside(col, row)) return floor
		const h = face(model.index(col, row))
		return Number.isNaN(h) ? floor : h
	}

	// Pass 1: count quads.
	let quads = 0
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const h = top(model.index(col, row))
			if (Number.isNaN(h)) continue
			quads++
			for (const s of SIDES) if (h - neighbourFace(col + s.dc, row + s.dr) > EPSILON) quads++
		}
	}

	const positions = new Float32Array(quads * 12)
	const normals = new Float32Array(quads * 12)
	const uvs = new Float32Array(quads * 8)
	const indices = new Uint32Array(quads * 6)
	const tile = new Uint32Array(quads * 4)
	const part = new Uint8Array(quads * 4)
	let q = 0

	const quad = (
		i: number,
		kind: number,
		n: readonly number[],
		corners: [number, number, number][],
		uv: [number, number][]
	) => {
		const v0 = q * 4
		for (let k = 0; k < 4; k++) {
			const v = v0 + k
			positions.set(corners[k], v * 3)
			normals.set(n, v * 3)
			uvs.set(uv[k], v * 2)
			tile[v] = i
			part[v] = kind
		}
		indices.set([v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3], q * 6)
		q++
	}

	// Pass 2: fill.
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const i = model.index(col, row)
			const h = top(i)
			if (Number.isNaN(h)) continue
			const x = { w: col - cols / 2, e: col + 1 - cols / 2 }
			const z = { n: rows / 2 - row - 1, s: rows / 2 - row }
			const y = h / cell
			// Top, CCW seen from above: NW, SW, SE, NE.
			quad(
				i,
				PART_TOP,
				[0, 1, 0],
				[
					[x.w, y, z.n],
					[x.w, y, z.s],
					[x.e, y, z.s],
					[x.e, y, z.n]
				],
				[
					[x.w, z.n],
					[x.w, z.s],
					[x.e, z.s],
					[x.e, z.n]
				]
			)
			for (const s of SIDES) {
				const low = neighbourFace(col + s.dc, row + s.dr)
				if (h - low <= EPSILON) continue
				const kind = h - low >= CLIFF_DROP ? PART_CLIFF : PART_STEP
				const [ax, az, bx, bz] = s.corners
				const yl = low / cell
				const along = s.dc === 0 ? x.w : z.n
				quad(
					i,
					kind,
					s.normal,
					[
						[x[ax], yl, z[az]],
						[x[bx], yl, z[bz]],
						[x[bx], y, z[bz]],
						[x[ax], y, z[az]]
					],
					[
						[along, yl],
						[along + 1, yl],
						[along + 1, y],
						[along, y]
					]
				)
			}
		}
	}
	return { positions, normals, uvs, indices, tile, part }
}
