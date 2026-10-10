import { describe, expect, it } from "vitest"
import { CREEPS, SENTINELS } from "#lib/content/units.ts"
import { openTerrain } from "#lib/testing/terrain.ts"
import {
	attacks,
	cadence,
	fullAt,
	run,
	testWorld as world,
	trace,
	waitingLane
} from "#lib/testing/world.ts"
import { STEP_FULL, TICK_RATE } from "./constants.ts"
import { Facing } from "./grid.ts"
import { World, type StructureSetup } from "./world.ts"

describe("World: walking", () => {
	it("walks its lane at its walk speed", () => {
		const w = world(openTerrain(40, 5))
		const creep = w.spawnCreep(w.lanes[0], "melee", 1, 2, Facing.east)
		// The first tick starts the step; each later tick adds the walk speed.
		const count = 81
		run(w, count)
		const steps = Math.floor(((count - 1) * CREEPS.melee.walk) / STEP_FULL)
		expect(creep.col).toBe(1 + steps)
		expect(creep.row).toBe(2)
	})

	it("doesn't charge while walking", () => {
		const w = world(openTerrain(40, 5))
		const creep = w.spawnCreep(w.lanes[0], "melee", 1, 2, Facing.east)
		for (let i = 0; i < 100; i++) {
			w.step()
			expect(creep.gauge).toBe(0)
		}
	})

	it("faces the way it walks", () => {
		const w = world(openTerrain(40, 5))
		const creep = w.spawnCreep(w.lanes[1], "melee", 30, 2, Facing.north)
		run(w, 10)
		expect(creep.facing).toBe(Facing.west)
	})
})

describe("World: fighting", () => {
	it("stands, charges and attacks every 100/speed seconds", () => {
		const w = world(openTerrain(12, 5))
		const radiant = w.spawnCreep(w.lanes[0], "melee", 5, 2, Facing.east)
		const dire = w.spawnCreep(w.lanes[1], "melee", 7, 2, Facing.west)
		const log = attacks(run(w, 200))
		const ticks = cadence(CREEPS.melee.speed, 3)
		expect(log.map((a) => [a.tick, a.attacker.id])).toEqual(
			ticks.flatMap((tick) => [
				[tick, radiant.id],
				[tick, dire.id]
			])
		)
		expect(ticks[0] / TICK_RATE).toBeCloseTo(3, 0)
	})

	it("deals ATK − DEF/2 when it hits", () => {
		const w = world(openTerrain(12, 5))
		w.spawnCreep(w.lanes[0], "melee", 5, 2, Facing.east)
		const dire = w.spawnCreep(w.lanes[1], "melee", 7, 2, Facing.west)
		const log = attacks(run(w, 200)).filter((a) => a.target === dire)
		const dealt = log.reduce((sum, a) => sum + a.damage, 0)
		expect(log.every((a) => a.damage === (a.hit ? 78 : 0))).toBe(true)
		expect(dire.hp).toBe(CREEPS.melee.hp - dealt)
	})

	it("closes in on a target in aggro range, without charging on the way", () => {
		const w = world(openTerrain(16, 5))
		const radiant = w.spawnCreep(w.lanes[0], "melee", 3, 2, Facing.east)
		const dire = w.spawnCreep(w.lanes[1], "melee", 10, 2, Facing.west)
		let firstAttack = -1
		for (let i = 0; i < 200 && firstAttack < 0; i++) {
			const tick = w.tick
			const events = w.step()
			for (const creep of [radiant, dire]) if (creep.step) expect(creep.gauge).toBe(0)
			if (events.some((e) => e.type === "attack")) firstAttack = tick
		}
		expect(Math.abs(radiant.col - dire.col) + Math.abs(radiant.row - dire.row)).toBeLessThanOrEqual(
			CREEPS.melee.reach
		)
		// It walked first, so its first attack comes later than a full charge from the start.
		expect(firstAttack).toBeGreaterThan(fullAt(CREEPS.melee.speed))
	})

	it("prefers enemy units to structures", () => {
		const board = openTerrain(30, 9)
		const tower: StructureSetup = { team: "radiant", tier: 1, entity: "t", col: 10, row: 4 }
		const w = world(board, { structures: [tower] })
		const dire = w.spawnCreep(w.lanes[1], "ranged", 16, 4, Facing.west)
		const radiant = w.spawnCreep(w.lanes[0], "melee", 16, 8, Facing.east)
		w.step()
		expect(dire.target).toBe(radiant)
	})
})

describe("World: Sentinels", () => {
	const board = openTerrain(30, 9)
	const tower: StructureSetup = { team: "radiant", tier: 1, entity: "t", col: 5, row: 4 }
	/** A Dire lane that ends where the creep stands, so it waits there. */
	const waiting = waitingLane("dire", 15, 4)

	it("hits the nearest enemy in reach every 4 s, never missing, until it dies", () => {
		const w = new World({ terrain: board, lanes: [waiting], structures: [tower], waves: false }, 1)
		// Its footprint spans cols 4–6, so the creep is 9 tiles away: in the tower's reach, out of
		// the creep's aggro.
		const creep = w.spawnCreep(w.lanes[0], "melee", 15, 4, Facing.west)
		const log = run(w, 400)
		const hits = attacks(log)
		// 450 − 4/2 a hit on creeps: the second kills a 550 HP creep.
		expect(hits.map((a) => a.tick)).toEqual(cadence(SENTINELS[1].speed, 2))
		expect(hits[1].tick - hits[0].tick).toBe(4 * TICK_RATE)
		expect(hits.every((a) => a.hit && a.damage === 448)).toBe(true)
		const death = log.find(({ event }) => event.type === "death")
		expect(death?.event).toEqual({
			type: "death",
			unit: creep,
			killer: w.units[0],
			bounty: 0,
			denied: false
		})
	})

	it("blocks its footprint", () => {
		const w = new World({ terrain: board, lanes: [waiting], structures: [tower], waves: false }, 1)
		expect(w.unitAt(4, 3)?.stats.structure).toBe(true)
		expect(w.unitAt(6, 5)?.stats.structure).toBe(true)
		expect(w.unitAt(7, 4)).toBeUndefined()
	})
})

describe("World: waves", () => {
	it("spawns 3 melee and 1 ranged per lane every 30 s, with siege every 5th wave", () => {
		const w = world(openTerrain(80, 9), { waves: true })
		const spawns = run(w, 5 * 30 * TICK_RATE).filter(({ event }) => event.type === "spawn")
		const byWave = Map.groupBy(spawns, ({ tick }) => tick / (30 * TICK_RATE))
		expect([...byWave.keys()]).toEqual([0, 1, 2, 3, 4])
		const kinds = (wave: number) =>
			(byWave.get(wave) ?? []).map(({ event }) =>
				event.type === "spawn" ? event.unit.stats.kind : ""
			)
		expect(kinds(0)).toEqual([
			"melee",
			"melee",
			"melee",
			"ranged",
			"melee",
			"melee",
			"melee",
			"ranged"
		])
		expect(kinds(4).filter((k) => k === "siege")).toHaveLength(2)
	})
})

describe("World: invariants", () => {
	/** A lane with a Sentinel each side, run with waves for two minutes. */
	function lane(seed: number) {
		const board = openTerrain(70, 11)
		const w = world(
			board,
			{
				waves: true,
				structures: [
					{ team: "radiant", tier: 1, entity: "r", col: 22, row: 5 },
					{ team: "dire", tier: 1, entity: "d", col: 47, row: 5 }
				]
			},
			seed
		)
		return w
	}

	it("never puts two units on one tile", () => {
		const w = lane(7)
		for (let i = 0; i < 120 * TICK_RATE; i++) {
			w.step()
			const claimed = new Map<string, number>()
			for (const u of w.units) {
				const r = u.stats.radius
				const tiles: [number, number][] = []
				for (let dr = -r; dr <= r; dr++)
					for (let dc = -r; dc <= r; dc++) tiles.push([u.col + dc, u.row + dr])
				if (u.step) tiles.push([u.step.col, u.step.row])
				for (const [c, row] of tiles) {
					const key = `${String(c)},${String(row)}`
					expect(claimed.get(key), `tick ${String(w.tick)} tile ${key}`).toBeUndefined()
					claimed.set(key, u.id)
				}
			}
		}
	})

	it("is deterministic for a seed", () => {
		const of = (seed: number) => trace(run(lane(seed), 120 * TICK_RATE))
		expect(of(3)).toBe(of(3))
		expect(of(3)).not.toBe(of(4))
	})
})
