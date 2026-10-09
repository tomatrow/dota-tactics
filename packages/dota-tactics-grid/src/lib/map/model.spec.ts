import { describe, expect, it } from "vitest"
import { fixtureMap } from "#lib/testing/fixture.ts"
import { gnvFlagNames, LANE_RADIUS, MapModel, segmentDistance } from "./model.ts"
import { MapFormatError, parseMap } from "./schema.ts"

describe("parseMap", () => {
	it("accepts a schema 1 document", () => {
		const doc = fixtureMap()
		expect(parseMap(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
	})

	it("refuses other schema versions by name", () => {
		const doc = { ...fixtureMap(), meta: { ...fixtureMap().meta, schema: 2 } }
		expect(() => parseMap(doc)).toThrow(/reads dota_map.json schema 1, but the file is schema 2/)
	})

	it("refuses layers that don't match the grid", () => {
		const doc = fixtureMap()
		doc.layers.water[1].pop()
		expect(() => parseMap(doc)).toThrow(MapFormatError)
		expect(() => parseMap(doc)).toThrow(/water rows should have 4 values/)
	})
})

describe("MapModel", () => {
	it("flattens layers row-major with row 0 south and NaN for no ground", () => {
		const model = new MapModel(fixtureMap({ height: (c, r) => (c === 3 ? null : c + 10 * r) }))
		expect(model.height[model.index(2, 1)]).toBe(12)
		expect(model.hasGround(model.index(3, 0))).toBe(false)
		expect(model.level[model.index(3, 0)]).toBeNaN()
		expect([model.minHeight, model.maxHeight]).toEqual([0, 22])
	})

	it("finds tiles with half-open cells", () => {
		const model = new MapModel(fixtureMap()) // origin (-128, -64), 4×3 tiles of 64
		expect(model.cellOf(-128, -64)).toEqual([0, 0])
		expect(model.cellOf(-64.5, 0)).toEqual([0, 1])
		expect(model.cellOf(-64, 0)).toEqual([1, 1])
		expect(model.cellOf(128, 0)).toBeNull()
		expect(model.tileCentre(0, 0)).toEqual([-96, -32])
	})

	it("blends sides by which Ancient is closer", () => {
		const model = new MapModel(
			fixtureMap({
				cols: 20,
				rows: 20,
				origin: [-640, -640],
				entities: [
					{ kind: "ancient", team: "radiant", x: -5000, y: -5000 },
					{ kind: "ancient", team: "dire", x: 5000, y: 5000 }
				]
			})
		)
		expect(model.sideAt(-5000, -5000)).toBe(0)
		expect(model.sideAt(5000, 5000)).toBe(1)
		expect(model.sideAt(3000, -3000)).toBeCloseTo(0.5)
	})

	it("marks walkable dry tiles near a lane path as road", () => {
		const model = new MapModel(
			fixtureMap({
				cols: 12,
				rows: 3,
				origin: [0, 0],
				walkable: (c) => (c === 5 ? 0 : 1),
				water: (c) => (c === 6 ? 1 : 0),
				lanes: [
					{
						lane: "mid",
						team: "radiant",
						points: [
							[0, 32, 128],
							[768, 32, 128]
						]
					}
				]
			})
		)
		const lane = (c: number, r: number) => model.lane[model.index(c, r)]
		expect(lane(0, 0)).toBe(1)
		expect(lane(0, 2)).toBe(1) // centre 160 units off the path, inside LANE_RADIUS
		expect(LANE_RADIUS).toBeGreaterThanOrEqual(160)
		expect(lane(5, 0)).toBe(0) // not walkable
		expect(lane(6, 0)).toBe(0) // water
	})

	it("indexes entities by tile and trees by position", () => {
		const model = new MapModel(
			fixtureMap({
				entities: [{ cell: [1, 2] }, { cell: [1, 2] }, { cell: null }],
				trees: [[0, 0, 1]]
			})
		)
		expect(model.entitiesByTile.get(model.index(1, 2))).toHaveLength(2)
		expect(model.treeAt.has("0,0")).toBe(true)
	})
})

describe("helpers", () => {
	it("measures distance to a segment, clamped to its ends", () => {
		expect(segmentDistance(5, 3, 0, 0, 10, 0)).toBe(3)
		expect(segmentDistance(-4, 3, 0, 0, 10, 0)).toBe(5)
	})

	it("decodes GridNav flags", () => {
		const flags = fixtureMap().meta.gnvFlags
		expect(gnvFlagNames(17, flags)).toEqual(["traversable", "wardBlocking"])
		expect(gnvFlagNames(0, flags)).toEqual([])
	})
})
