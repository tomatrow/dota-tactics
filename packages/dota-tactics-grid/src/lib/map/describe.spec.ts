import { describe, expect, it } from "vitest"
import { fixtureMap } from "#lib/testing/fixture.ts"
import { describeEntity, describeTile, treesOnCorners } from "./describe.ts"
import { entityTitle, isMinor } from "./entities.ts"
import { MapModel } from "./model.ts"
import type { MapEntity } from "./schema.ts"

const entity = (e: Partial<MapEntity>): MapEntity => fixtureMap({ entities: [e] }).entities[0]

describe("entity names", () => {
	it("spells out structures from their extras", () => {
		expect(entityTitle(entity({ kind: "tower", team: "radiant", tier: 1, lane: "top" }))).toBe(
			"Radiant tier 1 top tower"
		)
		expect(entityTitle(entity({ kind: "tower", team: "dire", tier: 4 }))).toBe("Dire tier 4 tower")
		expect(
			entityTitle(entity({ kind: "barracks", team: "dire", lane: "mid", type: "range" }))
		).toBe("Dire mid range barracks")
		expect(entityTitle(entity({ kind: "neutral_camp", size: "ancient" }))).toBe(
			"Ancient neutral camp"
		)
		expect(entityTitle(entity({ kind: "shop", shop: "secret" }))).toBe("Secret shop")
	})

	it("humanises kinds it has no name for, and treats them as minor", () => {
		const e = entity({ kind: "npc_dota_new_thing" })
		expect(entityTitle(e)).toBe("New thing")
		expect(isMinor(e)).toBe(true)
		expect(isMinor(entity({ kind: "tower" }))).toBe(false)
		expect(isMinor(entity({ kind: "lane_spawner" }))).toBe(true)
	})
})

describe("info panel", () => {
	const model = new MapModel(
		fixtureMap({
			origin: [0, 0],
			tree: (c, r) => (c === 1 && r === 1 ? 1 : 0),
			gnv: () => 17,
			trees: [[128, 128, 1]],
			entities: [
				{ kind: "tower", team: "radiant", tier: 2, lane: "bot", cell: [1, 1], x: 96, y: 96 }
			]
		})
	)

	it("describes a tile's layers and what stands on it", () => {
		const { title, rows } = describeTile(model, 1, 1)
		expect(title).toBe("Forest")
		expect(Object.fromEntries(rows)).toMatchObject({
			Tile: "1, 1",
			Centre: "+96, +96",
			Height: "128 · level 1",
			Walkable: "Yes",
			Trees: "blocked (1 on corners)",
			GridNav: "17 · traversable, ward-blocking",
			Here: "Radiant tier 2 bot tower"
		})
	})

	it("counts trees on a tile's four corners", () => {
		expect(treesOnCorners(model, 1, 1)).toBe(1)
		expect(treesOnCorners(model, 2, 2)).toBe(1)
		expect(treesOnCorners(model, 0, 0)).toBe(0)
	})

	it("describes an entity with its extras", () => {
		const e = model.data.entities[0]
		const { title, team, rows } = describeEntity(model, e)
		expect([title, team]).toEqual(["Radiant tier 2 bot tower", "radiant"])
		expect(Object.fromEntries(rows)).toMatchObject({ Tile: "1, 1", Tier: "2", Lane: "bot" })
	})
})
