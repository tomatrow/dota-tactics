/**
 * Types for `dota_map.json` schema 1, as written by `packages/dota-cartographer`, plus a parser that
 * checks the parts the viewer relies on. Everything is in Dota game units: x east, y north, z up.
 * Layers are arrays of `rows` rows of `cols` values, row 0 at the south edge.
 */

export const SCHEMA = 1

export type Team = "radiant" | "dire" | "neutral" | "none"
export type LaneName = "top" | "mid" | "bot"
export type Point3 = [x: number, y: number, z: number]

export interface MapMeta {
	schema: number
	generator: string
	source: { vpk: string; sha256: string; map: string; vrf: string }
	units: string
	tileGrid: { stepHeight: number; minHeight: number; maxHeight: number; heightShift: number }
	levels: { ground: [number, number] | null; walkable: [number, number] | null }
	bounds: { source: string; min: [number, number]; max: [number, number] }
	gnvFlags: Record<string, number>
}

export interface MapGrid {
	cell: number
	origin: [x: number, y: number]
	cols: number
	rows: number
}

export interface MapLayers {
	height: (number | null)[][]
	heightRange: (number | null)[][]
	level: (number | null)[][]
	walkable: number[][]
	water: number[][]
	tree: number[][]
	gnv: number[][]
}

export interface MapEntity {
	kind: string
	class: string
	name: string
	unit: string | null
	team: Team
	x: number
	y: number
	z: number
	yaw: number
	cell: [col: number, row: number] | null
	tier?: number
	lane?: LaneName
	type?: string
	size?: string
	shop?: string
}

export interface MapLane {
	lane: LaneName
	team: Team
	points: Point3[]
}

export interface DotaMap {
	meta: MapMeta
	grid: MapGrid
	layers: MapLayers
	treeLayers: (string | null)[]
	/** `[x, y, layer]`: an index into `treeLayers`. */
	trees: [x: number, y: number, layer: number][]
	entities: MapEntity[]
	lanes: MapLane[]
}

export const LAYER_NAMES = [
	"height",
	"heightRange",
	"level",
	"walkable",
	"water",
	"tree",
	"gnv"
] as const satisfies readonly (keyof MapLayers)[]

export class MapFormatError extends Error {
	override name = "MapFormatError"
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function require(condition: boolean, message: string): asserts condition {
	if (!condition) throw new MapFormatError(message)
}

/** Checks the shape the viewer depends on and returns the document typed. */
export function parseMap(json: unknown): DotaMap {
	require(isRecord(json), "dota_map.json should be a JSON object")
	const meta = json.meta
	require(isRecord(meta), "missing meta")
	require(meta.schema ===
		SCHEMA, `this viewer reads dota_map.json schema ${SCHEMA}, but the file is schema ${String(meta.schema)}`)
	const grid = json.grid
	require(isRecord(grid), "missing grid")
	const { cols, rows, cell } = grid
	require(Number.isInteger(cols) &&
		Number.isInteger(rows) &&
		typeof cell === "number", "grid needs integer cols and rows and a cell size")
	const layers = json.layers
	require(isRecord(layers), "missing layers")
	for (const name of LAYER_NAMES) {
		const layer = layers[name]
		require(Array.isArray(layer) &&
			layer.length === rows, `layer ${name} should have ${String(rows)} rows`)
		for (const row of layer) {
			require(Array.isArray(row) &&
				row.length === cols, `layer ${name} rows should have ${String(cols)} values`)
		}
	}
	for (const key of ["treeLayers", "trees", "entities", "lanes"]) {
		require(Array.isArray(json[key]), `missing ${key}`)
	}
	return json as unknown as DotaMap
}
