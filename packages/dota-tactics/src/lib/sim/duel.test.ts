import { describe, expect, it } from "vitest"
import { JOBS, type JobId } from "#lib/content/heroes.ts"
import { TUNING } from "#lib/content/tuning.ts"
import { openTerrain } from "#lib/testing/terrain.ts"
import { attacks, run, testWorld, until, waitingLane } from "#lib/testing/world.ts"
import { TICK_RATE } from "./constants.ts"
import { Facing } from "./grid.ts"
import type { Unit } from "./unit.ts"
import type { LaneSetup, Scenario, StructureSetup, World } from "./world.ts"

/**
 * Two heroes on an open 40 × 9 board: the Radiant Warrior and the Dire Black Mage (unless the
 * options say otherwise) at their halls, Clan Halls that don't heal unless `regen`, no waves.
 */
function duel(
	options: {
		radiant?: JobId
		dire?: JobId
		halls?: { radiant: readonly [number, number]; dire: readonly [number, number] }
		lanes?: LaneSetup[]
		structures?: StructureSetup[]
		scenario?: Partial<Scenario>
	} = {},
	seed = 1
): { w: World; radiant: Unit; dire: Unit } {
	const w = testWorld(
		openTerrain(40, 9),
		{
			heroes: [
				{ team: "radiant", job: options.radiant ?? "warrior" },
				{ team: "dire", job: options.dire ?? "blackMage" }
			],
			halls: options.halls ?? { radiant: [10, 4], dire: [12, 4] },
			lanes: options.lanes ?? [],
			structures: options.structures ?? [],
			regen: false,
			...options.scenario
		},
		seed
	)
	const [radiant, dire] = w.heroes
	return { w, radiant, dire }
}

describe("Duel: killing a hero", () => {
	it("pays the killer 125 + 8 × level gold and a kill, and the victim a death", () => {
		const { w, radiant, dire } = duel()
		dire.hp = 50
		w.command(radiant.id, { type: "attack", target: dire.id })
		const log = until(w, () => !dire.alive, 1000)
		const death = log.find(({ event }) => event.type === "death")?.event
		const bounty = TUNING.heroBounty + TUNING.heroBountyPerLevel
		expect(death).toEqual({ type: "death", unit: dire, killer: radiant, bounty, denied: false })
		expect(bounty).toBe(133)
		expect([radiant.hero?.gold, radiant.hero?.kills, radiant.hero?.deaths]).toEqual([133, 1, 0])
		expect([dire.hero?.kills, dire.hero?.deaths]).toEqual([0, 1])
	})

	it("pays nothing when a creep or a Sentinel kills a hero, but counts the death", () => {
		const { w, radiant } = duel({ lanes: [waitingLane("dire", 13, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "ranged", 13, 4, Facing.west)
		radiant.hp = 30
		until(w, () => !radiant.alive, 1000)
		expect(creep.alive).toBe(true)
		expect([radiant.hero?.deaths, radiant.hero?.gold]).toEqual([1, 0])
	})
})

describe("Duel: aggro (§6, §9)", () => {
	it("draws the victim's creeps onto a hero that attacks their hero, for 4 s", () => {
		const { w, radiant, dire } = duel({
			lanes: [waitingLane("radiant", 16, 6), waitingLane("dire", 16, 5)]
		})
		const ours = w.spawnCreep(w.lanes[0], "melee", 16, 6, Facing.south)
		const theirs = w.spawnCreep(w.lanes[1], "ranged", 16, 5, Facing.north)
		ours.hp = 100_000
		theirs.hp = 100_000
		dire.hp = 100_000
		// The creeps fight; then the Warrior hits the mage, 6 tiles from the Dire creep.
		run(w, 3 * TICK_RATE)
		expect(theirs.target).toBe(ours)
		w.command(radiant.id, { type: "attack", target: dire.id })
		until(w, () => radiant.lastAttack >= 0, 400)
		const blow = radiant.lastAttack
		const after = attacks(run(w, 8 * TICK_RATE)).filter((a) => a.attacker === theirs)
		const provoked = blow + TUNING.aggroTime * TICK_RATE
		expect(after.filter((a) => a.tick < provoked).every((a) => a.target === radiant)).toBe(true)
		expect(after.some((a) => a.tick < provoked && a.target === radiant)).toBe(true)
		// Then back to the creep it was fighting (the Warrior's own blows, repeating, draw it
		// again: so it's the first attack after the Warrior stops).
		w.command(radiant.id, { type: "stop" })
		const later = attacks(run(w, 8 * TICK_RATE)).filter((a) => a.attacker === theirs)
		expect(later.at(-1)?.target).toBe(ours)
	})

	it("turns a Sentinel on a hero that attacks its hero in its reach; denying drops it", () => {
		const { w, radiant, dire } = duel({
			halls: { radiant: [12, 4], dire: [14, 4] },
			lanes: [waitingLane("radiant", 17, 4)],
			structures: [{ team: "dire", tier: 1, entity: "t", col: 20, row: 4 }]
		})
		const tower = w.units.find((u) => u.stats.structure)
		if (!tower) throw new Error("no Sentinel")
		const creep = w.spawnCreep(w.lanes[0], "melee", 17, 4, Facing.east)
		creep.hp = 100_000
		dire.hp = 100_000
		radiant.hp = 100_000
		run(w, 2)
		expect(tower.target).toBe(creep)
		w.command(radiant.id, { type: "attack", target: dire.id })
		until(w, () => tower.target === radiant, 400)
		// A blow on its own creep (under half its HP) sheds the aggro: the Sentinel goes back to
		// the nearest, the creep.
		creep.hp = 250
		w.command(radiant.id, { type: "attack", target: creep.id })
		until(w, () => tower.target !== radiant, 400)
		run(w, 1)
		expect(tower.target).toBe(creep)
	})
})

describe("Duel: the Clan Hall", () => {
	it("gives a hero in its area 5% of its HP a second, and nothing outside it", () => {
		const { w, radiant } = duel({
			halls: { radiant: [3, 4], dire: [36, 4] },
			scenario: { regen: true }
		})
		const max = JOBS.warrior.stats.hp
		radiant.hp = 100
		run(w, TICK_RATE + 1)
		expect(radiant.hp).toBe(100 + 2 * Math.floor(max * 0.05))
		w.command(radiant.id, { type: "move", col: 3 + TUNING.hallRadius + 2, row: 4 })
		until(w, () => radiant.hero?.order.type === "idle", 400)
		const hp = radiant.hp
		run(w, 3 * TICK_RATE)
		expect(radiant.hp).toBe(hp)
	})
})

describe("Duel: victory", () => {
	it("goes to the team that destroys the other's objective", () => {
		const { w, radiant } = duel({
			halls: { radiant: [14, 4], dire: [36, 4] },
			structures: [
				{ team: "dire", tier: 1, entity: "dire t1", col: 20, row: 4, objective: true },
				{ team: "radiant", tier: 1, entity: "radiant t1", col: 4, row: 4, objective: true }
			]
		})
		const tower = w.units.find((u) => u.entity === "dire t1")
		if (!tower) throw new Error("no Sentinel")
		tower.hp = 50
		radiant.hp = 100_000
		expect(w.winner).toBeNull()
		w.command(radiant.id, { type: "attack", target: tower.id })
		const log = until(w, () => !tower.alive, 1000)
		expect(log.map(({ event }) => event).filter((e) => e.type === "victory")).toEqual([
			{ type: "victory", team: "radiant" }
		])
		expect(w.winner).toBe("radiant")
	})

	it("isn't decided by a structure that isn't an objective", () => {
		const { w, radiant } = duel({
			halls: { radiant: [14, 4], dire: [36, 4] },
			structures: [{ team: "dire", tier: 1, entity: "t", col: 20, row: 4 }]
		})
		const tower = w.units.find((u) => u.stats.structure)
		if (!tower) throw new Error("no Sentinel")
		tower.hp = 50
		radiant.hp = 100_000
		w.command(radiant.id, { type: "attack", target: tower.id })
		until(w, () => !tower.alive, 1000)
		expect(w.winner).toBeNull()
	})
})
