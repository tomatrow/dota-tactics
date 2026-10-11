import { describe, expect, it } from "vitest"
import { JOBS } from "#lib/content/heroes.ts"
import { openTerrain } from "#lib/testing/terrain.ts"
import { testWorld, waitingLane } from "#lib/testing/world.ts"
import { GAUGE_FULL, TICK_RATE } from "./constants.ts"
import { Facing } from "./grid.ts"
import { Telemetry } from "./telemetry.ts"
import type { World } from "./world.ts"

/** Ticks a speed-20 Warrior's gauge takes to fill from empty. */
const CHARGE = GAUGE_FULL / JOBS.warrior.stats.speed

/** A Radiant Warrior at (3, 4), a Dire melee creep that waits at (5, 4), and telemetry on both. */
function setup() {
	const w = testWorld(openTerrain(30, 9), {
		heroes: [{ team: "radiant", job: "warrior" }],
		halls: { radiant: [3, 4] },
		lanes: [waitingLane("radiant", 1, 1), waitingLane("dire", 5, 4)],
		regen: false
	})
	const hero = w.heroes[0]
	const creep = w.spawnCreep(w.lanes[1], "melee", 5, 4, Facing.west)
	const telemetry = new Telemetry(w)
	return { w, hero, creep, telemetry }
}

function steps(w: World, telemetry: Telemetry, count: number) {
	for (let i = 0; i < count; i++) telemetry.record(w.step())
}

describe("Telemetry", () => {
	it("counts a gauge sitting full, and how long it waited when the hero acts", () => {
		const { w, hero, creep, telemetry } = setup()
		steps(w, telemetry, 150)
		w.command(hero.id, { type: "attack", target: creep.id })
		steps(w, telemetry, 1)
		const s = telemetry.summary(hero)
		expect(s.actions).toBe(1)
		// Full after the step of tick CHARGE − 1; it acted on tick 150.
		const waited = 150 - (CHARGE - 1)
		expect(s.medianWait).toBe(waited / TICK_RATE)
		expect(s.buckets).toEqual([0, 0, 1, 0, 0])
		expect(s.prompt).toBe(0)
		expect(s.ready).toBeCloseTo(waited / 151)
		expect(s.charging).toBeCloseTo((151 - waited) / 151)
		expect(s.walking).toBe(0)
		expect(s.mostPerMinute).toBe(12)
	})

	it("counts an attack order's blows as taken the moment the gauge fills", () => {
		const { w, hero, creep, telemetry } = setup()
		w.command(hero.id, { type: "attack", target: creep.id })
		steps(w, telemetry, 3 * CHARGE)
		const s = telemetry.summary(hero)
		expect(s.actions).toBe(3)
		expect(s.prompt).toBe(1)
		expect(s.medianWait).toBe(0)
		expect(s.actionsPerMinute).toBeCloseTo(12)
	})

	it("counts walking, which pauses the gauge", () => {
		const { w, hero, telemetry } = setup()
		w.command(hero.id, { type: "move", col: 20, row: 4 })
		steps(w, telemetry, 60)
		const s = telemetry.summary(hero)
		expect(s.walking).toBeGreaterThan(0.9)
		expect(hero.gauge).toBeLessThan(GAUGE_FULL / 10)
	})

	it("starts afresh on reset", () => {
		const { w, hero, creep, telemetry } = setup()
		w.command(hero.id, { type: "attack", target: creep.id })
		steps(w, telemetry, CHARGE)
		expect(telemetry.summary(hero).actions).toBe(1)
		telemetry.reset()
		expect(telemetry.since).toBe(w.tick)
		expect(telemetry.summary(hero)).toMatchObject({ actions: 0, minutes: 0, walking: 0 })
	})
})
