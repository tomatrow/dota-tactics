import type { DotaMap, MapEntity, MapLane } from "#lib/map/schema.ts"

type Cell = (col: number, row: number) => number
type MaybeCell = (col: number, row: number) => number | null

export interface FixtureOptions {
	cols?: number
	rows?: number
	cell?: number
	origin?: [number, number]
	height?: MaybeCell
	heightRange?: Cell
	walkable?: Cell
	water?: Cell
	tree?: Cell
	gnv?: Cell
	entities?: Partial<MapEntity>[]
	lanes?: MapLane[]
	trees?: [number, number, number][]
}

/** A small schema-1 document; every layer defaults to flat, walkable, dry ground at height 128. */
export function fixtureMap(options: FixtureOptions = {}): DotaMap {
	const { cols = 4, rows = 3, cell = 64, origin = [-128, -64] } = options
	const grid = <T>(f: (col: number, row: number) => T): T[][] =>
		Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => f(col, row)))
	const height = grid(options.height ?? (() => 128))
	return {
		meta: {
			schema: 1,
			generator: "test",
			source: { vpk: "test.vpk", sha256: "0123456789abcdef", map: "test", vrf: "0" },
			units: "Dota game units; x east, y north, z up",
			tileGrid: { stepHeight: 128, minHeight: 0, maxHeight: 1024, heightShift: 0 },
			levels: { ground: [0, 2], walkable: [0, 2] },
			bounds: {
				source: "test",
				min: origin,
				max: [origin[0] + cols * cell, origin[1] + rows * cell]
			},
			gnvFlags: {
				traversable: 1,
				blocked: 2,
				heroBlocking: 4,
				creatureBlocking: 8,
				wardBlocking: 16
			}
		},
		grid: { cell, origin, cols, rows },
		layers: {
			height,
			heightRange: grid(options.heightRange ?? (() => 0)),
			level: height.map((row) => row.map((h) => (h === null ? null : Math.floor(h / 128 + 0.5)))),
			walkable: grid(options.walkable ?? (() => 1)),
			water: grid(options.water ?? (() => 0)),
			tree: grid(options.tree ?? (() => 0)),
			gnv: grid(options.gnv ?? (() => 1))
		},
		treeLayers: ["radiant_base", null],
		trees: options.trees ?? [],
		entities: (options.entities ?? []).map((e) => ({
			kind: "tower",
			class: "npc_dota_tower",
			name: "",
			unit: null,
			team: "none",
			x: 0,
			y: 0,
			z: 128,
			yaw: 0,
			cell: null,
			...e
		})),
		lanes: options.lanes ?? []
	}
}
