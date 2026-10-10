import { describe, expect, it } from "vitest"
import { loadMapFromDisk } from "#lib/testing/map.ts"
import { UNREACHABLE } from "./lane-field.ts"
import { mapScenario } from "./scenario.ts"
import { World } from "./world.ts"

const model = loadMapFromDisk()

describe("mapScenario on the real map", () => {
	const scenario = mapScenario(model)

	it("has both teams' mid lanes and T1s", () => {
		expect(scenario.lanes.map((l) => `${l.team} ${l.lane}`)).toEqual(["radiant mid", "dire mid"])
		expect(scenario.structures.map((s) => s.entity).sort()).toEqual([
			"dota_badguys_tower1_mid",
			"dota_goodguys_tower1_mid"
		])
	})

	it("can walk each lane from its spawner to its end", () => {
		const world = new World(scenario, 1)
		for (const lane of world.lanes) {
			expect(lane.field.at(...lane.spawner)).toBeLessThan(UNREACHABLE)
		}
	})

	it("can add more lanes and tiers", () => {
		const full = mapScenario(model, { lanes: ["top", "mid", "bot"], maxTier: 3 })
		expect(full.lanes).toHaveLength(6)
		expect(full.structures).toHaveLength(18)
	})
})
