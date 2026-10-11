import { describe, expect, it } from "vitest"
import { JOBS } from "#lib/content/heroes.ts"
import { defaultRules, setNumber } from "#lib/content/rules.ts"
import { TUNING } from "#lib/content/tuning.ts"
import { openTerrain } from "#lib/testing/terrain.ts"
import { lanes, run, testWorld } from "#lib/testing/world.ts"
import { GAUGE_FULL, TICK_RATE } from "./constants.ts"
import { World } from "./world.ts"

const board = openTerrain(30, 9)

function setup() {
	const w = testWorld(board, {
		heroes: [{ team: "radiant", job: "warrior" }],
		halls: { radiant: [3, 4] },
		regen: false
	})
	return { w, hero: w.heroes[0] }
}

describe("World#tune", () => {
	it("changes a hero's speed from the next tick", () => {
		const { w, hero } = setup()
		run(w, 10)
		expect(hero.gauge).toBe(10 * 20)
		expect(w.tune("jobs.warrior.stats.speed", 40)).toBe(true)
		expect(hero.stats.speed).toBe(40)
		run(w, 10)
		expect(hero.gauge).toBe(10 * 20 + 10 * 40)
	})

	it("lets a walking hero charge (§11's lever: partial charge while walking)", () => {
		const { w, hero } = setup()
		w.tune("tuning.walkCharge", 50)
		w.command(hero.id, { type: "move", col: 25, row: 4 })
		run(w, 21)
		expect(hero.step).not.toBeNull()
		expect(hero.gauge).toBe(20 * 10)
	})

	it("keeps HP within a lowered maximum", () => {
		const { w, hero } = setup()
		w.tune("jobs.warrior.stats.hp", 500)
		expect(hero.hp).toBe(500)
	})

	it("changes the wave interval after the wave that's due", () => {
		const w = new World({ terrain: board, lanes: lanes(board), structures: [] }, 1)
		run(w, 1)
		expect(w.nextWave).toBe(TUNING.waveInterval * TICK_RATE)
		w.tune("tuning.waveInterval", 10)
		const log = run(w, TUNING.waveInterval * TICK_RATE + 10 * TICK_RATE)
		const waves = new Set(log.flatMap(({ tick, event }) => (event.type === "spawn" ? [tick] : [])))
		expect([...waves]).toEqual([600, 800])
	})

	it("refuses what isn't a number, and leaves other worlds alone", () => {
		const { w } = setup()
		expect(w.tune("jobs.warrior.name", 1)).toBe(false)
		expect(w.tune("jobs.warrior.stats.speed", 30)).toBe(true)
		expect(setup().hero.stats.speed).toBe(JOBS.warrior.stats.speed)
	})

	it("plays by rules it's given", () => {
		const rules = defaultRules()
		setNumber(rules, "jobs.warrior.stats.speed", GAUGE_FULL / 10)
		const w = new World(
			{
				terrain: board,
				lanes: lanes(board),
				structures: [],
				waves: false,
				heroes: [{ team: "radiant", job: "warrior" }],
				halls: { radiant: [3, 4] }
			},
			1,
			rules
		)
		run(w, 10)
		expect(w.heroes[0].gauge).toBe(GAUGE_FULL)
	})
})
