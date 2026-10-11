import { describe, expect, it } from "vitest"
import { numbers } from "#lib/content/rules.ts"
import { openTerrain } from "#lib/testing/terrain.ts"
import { testWorld } from "#lib/testing/world.ts"
import { sections, signed } from "./tuning.ts"

function slice() {
	return testWorld(openTerrain(30, 9), {
		heroes: [
			{ team: "radiant", job: "warrior" },
			{ team: "dire", job: "blackMage" }
		],
		halls: { radiant: [3, 4], dire: [26, 4] },
		structures: [{ team: "dire", tier: 1, entity: "tower", col: 20, row: 4 }]
	})
}

describe("the tuning window's numbers", () => {
	const world = slice()
	const list = sections(world)
	const knobs = list.flatMap((s) => s.groups.flatMap((g) => g.knobs))
	const paths = new Set(knobs.map((k) => k.path))

	it("groups them as the design does", () => {
		expect(list.map((s) => s.title)).toEqual([
			"Rules",
			"Heroes",
			"Abilities",
			"Statuses",
			"Creeps",
			"Sentinels"
		])
		expect(list[1].groups.map((g) => g.title)).toEqual(["Bangaa Warrior", "Nu Mou Black Mage"])
		expect(list[2].groups.map((g) => g.title)).toEqual([
			"First Aid",
			"Rend Speed",
			"Body Slam",
			"Fire",
			"Blizzard",
			"Fira"
		])
		expect(list[5].groups.map((g) => g.title)).toEqual(["Sentinel T1"])
	})

	it("lists the numbers that matter, and leaves out the ones that can't change or do nothing", () => {
		for (const path of [
			"tuning.walkCharge",
			"jobs.warrior.stats.speed",
			"jobs.blackMage.stats.walk",
			"abilities.fira.charge",
			"abilities.blizzard.effect.inflicts.seconds",
			"statuses.slow.speed",
			"creeps.siege.vsStructures",
			"sentinels.1.atk"
		]) {
			expect(paths).toContain(path)
		}
		for (const path of [
			"tuning.laneCorridor",
			"jobs.warrior.stats.radius",
			"creeps.melee.mp",
			"sentinels.1.walk",
			"sentinels.2.atk"
		]) {
			expect(paths).not.toContain(path)
		}
	})

	it("names every one, and every one is a number in the rules", () => {
		const all = numbers(world.rules)
		for (const knob of knobs) {
			expect(all.has(knob.path), knob.path).toBe(true)
			expect(knob.hint, knob.path).not.toBe("")
		}
	})

	it("lets only a status's speed go below 0", () => {
		expect(signed("statuses.slow.speed")).toBe(true)
		expect(signed("jobs.warrior.stats.speed")).toBe(false)
	})
})
