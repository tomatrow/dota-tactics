import { describe, expect, it } from "vitest"
import { loadMapFromDisk } from "#lib/testing/map.ts"
import { TICK_RATE } from "./constants.ts"
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

	it("starts the Warrior at the Radiant fountain, 4-way walking ~37 s from its T1 mid", () => {
		const world = new World({ ...scenario, waves: false }, 1)
		const [hero] = world.heroes
		const fountain = model.data.entities.find((e) => e.name === "ent_dota_fountain_good")
		const [col, row] = fountain?.cell ?? [0, 0]
		expect(Math.abs(hero.col - col) + Math.abs(hero.row - row)).toBeLessThan(8)
		const t1 = world.units.find((u) => u.entity === "dota_goodguys_tower1_mid")
		if (!t1) throw new Error("no T1")
		world.command(hero.id, { type: "move", col: t1.col + 2, row: t1.row + 2 })
		world.step()
		while (hero.hero?.order.type !== "idle" && world.tick < 60 * TICK_RATE) world.step()
		expect([hero.col, hero.row]).toEqual([t1.col + 2, t1.row + 2])
		// DESIGN.md §4: 37 s at 4.7 tiles/s, 4-way.
		expect(world.time).toBeGreaterThan(35)
		expect(world.time).toBeLessThan(41)
	})

	it("can add more lanes and tiers", () => {
		const full = mapScenario(model, { lanes: ["top", "mid", "bot"], maxTier: 3 })
		expect(full.lanes).toHaveLength(6)
		expect(full.structures).toHaveLength(18)
	})
})
