import { describe, expect, it } from "vitest"
import { fixtureMap } from "#lib/testing/fixture.ts"
import { classify, describeGnv, hex, layerStyle, ramp, toCss, type Legend } from "./layers.ts"
import { MapModel } from "./model.ts"

const swatches = (legend: Legend) => {
	if (legend.kind !== "swatches") throw new Error("expected swatches")
	return legend.items
}

describe("classify", () => {
	// One row of tiles, each a different class.
	const model = new MapModel(
		fixtureMap({
			cols: 7,
			rows: 1,
			origin: [0, 0],
			height: (c) => (c === 0 ? null : 128),
			water: (c) => (c === 1 ? 1 : 0),
			walkable: (c) => (c === 2 ? 0 : 1),
			tree: (c) => (c === 3 ? 1 : 0),
			heightRange: (c) => (c === 5 ? 80 : 0),
			lanes: [
				{
					lane: "top",
					team: "dire",
					points: [
						[256, 32, 128],
						[288, 32, 128]
					]
				}
			]
		})
	)

	it("puts each tile in one terrain class, in priority order", () => {
		expect(Array.from({ length: 7 }, (_, c) => classify(model, c))).toEqual([
			"void",
			"water",
			"cliff",
			"forest",
			"lane",
			"lane", // ramps near a lane are road
			"lane"
		])
	})

	it("counts every drawn tile in the terrain legend", () => {
		const items = swatches(layerStyle(model, "terrain").legend)
		expect(items.reduce((n, i) => n + (i.count ?? 0), 0)).toBe(6)
		expect(items.map((i) => i.label)).toContain("Lane road")
	})
})

describe("layer styles", () => {
	it("lists only levels that have walkable tiles, highest first", () => {
		const model = new MapModel(fixtureMap({ height: (c) => (c < 2 ? 0 : 256) }))
		const labels = swatches(layerStyle(model, "level").legend).map((i) => i.label)
		expect(labels).toEqual(["Level 2", "Level 0", "Not walkable (dimmed)"])
	})

	it("labels GridNav values with their decoded flags, most common first", () => {
		const model = new MapModel(fixtureMap({ gnv: (c) => (c === 0 ? 20 : 1) }))
		const items = swatches(layerStyle(model, "gnv").legend)
		expect(items.map((i) => [i.label, i.count])).toEqual([
			["1 · traversable", 9],
			["20 · hero-blocking, ward-blocking", 3]
		])
		expect(describeGnv(0, model.data.meta.gnvFlags)).toBe("no flags")
	})

	it("paints walls of data layers darker than the top", () => {
		const model = new MapModel(fixtureMap())
		const { top, cliff } = layerStyle(model, "walkable").paint(0)
		expect(cliff[1]).toBeLessThan(top[1])
	})
})

describe("colours", () => {
	it("round-trips hex and samples ramps at their ends", () => {
		expect(toCss(hex(0x74d48e))).toBe("#74d48e")
		const stops = [hex(0x000000), hex(0xffffff)]
		expect(toCss(ramp(stops, 0))).toBe("#000000")
		expect(toCss(ramp(stops, 1))).toBe("#ffffff")
		expect(toCss(ramp(stops, 2))).toBe("#ffffff")
	})
})
