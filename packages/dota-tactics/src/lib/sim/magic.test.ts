import { describe, expect, it } from "vitest"
import { JOBS, type JobId } from "#lib/content/heroes.ts"
import { openTerrain, terrain } from "#lib/testing/terrain.ts"
import {
	attacks,
	lanes,
	run,
	testWorld,
	trace,
	until,
	waitingLane,
	type Logged
} from "#lib/testing/world.ts"
import type { Command } from "./commands.ts"
import { GAUGE_FULL, TICK_RATE } from "./constants.ts"
import type { SimEvent } from "./events.ts"
import { Facing, type Terrain } from "./grid.ts"
import type { Unit } from "./unit.ts"
import type { HeroSetup, LaneSetup, Scenario, World } from "./world.ts"

const MAGE = JOBS.blackMage.stats
/** Ticks for the mage's speed-18 gauge to fill from empty. */
const MAGE_CHARGE = Math.ceil(GAUGE_FULL / MAGE.speed)

/** A world with the Radiant hero (the Black Mage unless `job` says), and maybe a Dire hero. */
function setup(
	options: {
		job?: JobId
		board?: Terrain
		hall?: readonly [number, number]
		/** A Dire hero, at its own hall. */
		enemy?: { job: JobId; hall: readonly [number, number] }
		lanes?: LaneSetup[]
		scenario?: Partial<Scenario>
	} = {},
	seed = 1
): { w: World; hero: Unit; enemy: Unit | undefined } {
	const board = options.board ?? openTerrain(30, 9)
	const heroes: HeroSetup[] = [{ team: "radiant", job: options.job ?? "blackMage" }]
	if (options.enemy) heroes.push({ team: "dire", job: options.enemy.job })
	const w = testWorld(
		board,
		{
			heroes,
			halls: {
				radiant: options.hall ?? [3, 4],
				...(options.enemy && { dire: options.enemy.hall })
			},
			lanes: options.lanes ?? [],
			...options.scenario
		},
		seed
	)
	return { w, hero: w.heroes[0], enemy: w.heroes.at(1) }
}

const events = <T extends SimEvent["type"]>(log: readonly Logged[], type: T) =>
	log.flatMap(({ tick, event }) =>
		event.type === type ? [{ tick, event: event as Extract<SimEvent, { type: T }> }] : []
	)

describe("Black Mage: MP", () => {
	it("starts with none, so its first action is the rod; Fire then costs 8 of the 10 an action gives", () => {
		const { w, hero } = setup({ lanes: [waitingLane("dire", 5, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "melee", 5, 4, Facing.west)
		creep.hp = 10_000
		w.command(hero.id, { type: "ability", ability: "fire", target: creep.id })
		run(w, 1)
		expect(hero.hero?.order.type).toBe("idle")
		w.command(hero.id, { type: "attack", target: creep.id })
		until(w, () => hero.mp === 10)
		w.command(hero.id, { type: "ability", ability: "fire", target: creep.id })
		const log = until(w, () => hero.mp !== 10)
		expect(hero.mp).toBe(12)
		expect(events(log, "magic").map((e) => e.event)).toEqual([
			{ type: "magic", attacker: hero, target: creep, ability: "fire", damage: 180 }
		])
		// A spell on what it was attacking: it goes back to attacking it.
		expect(hero.hero?.order).toEqual({ type: "attack", target: creep })
	})
})

describe("Black Mage: Fire", () => {
	/** The mage charged, with 8 MP; Dire creeps waiting on (10, 4), Radiant on (10, 5). */
	function ready() {
		const { w, hero } = setup({
			lanes: [waitingLane("dire", 10, 4), waitingLane("radiant", 10, 5)]
		})
		run(w, MAGE_CHARGE)
		hero.mp = 8
		const [dire, radiant] = w.lanes
		return { w, hero, dire, radiant }
	}

	it("hits every enemy within 1 of its tile for 180, and never an ally", () => {
		const { w, hero, dire, radiant } = ready()
		const centre = w.spawnCreep(dire, "melee", 10, 4, Facing.west)
		const beside = w.spawnCreep(dire, "melee", 11, 4, Facing.west)
		const outside = w.spawnCreep(dire, "melee", 10, 6, Facing.west)
		const ally = w.spawnCreep(radiant, "melee", 10, 5, Facing.east)
		w.command(hero.id, { type: "abilityAt", ability: "fire", col: 10, row: 4 })
		const log = run(w, 1)
		expect(events(log, "spell").map((e) => e.event)).toEqual([
			{ type: "spell", unit: hero, ability: "fire", col: 10, row: 4 }
		])
		expect(events(log, "magic").map((e) => [e.event.target, e.event.damage])).toEqual([
			[centre, 180],
			[beside, 180]
		])
		expect([outside.hp, ally.hp]).toEqual([550, 550])
		// It stays where it was: a spell doesn't send it in to club.
		run(w, 100)
		expect([hero.col, hero.row]).toEqual([3, 4])
	})

	it("last-hits everything it kills", () => {
		const { w, hero, dire } = ready()
		const a = w.spawnCreep(dire, "melee", 10, 4, Facing.west)
		const b = w.spawnCreep(dire, "ranged", 10, 3, Facing.west)
		a.hp = 150
		b.hp = 150
		w.command(hero.id, { type: "abilityAt", ability: "fire", col: 10, row: 4 })
		const deaths = events(run(w, 1), "death").map((e) => e.event)
		expect(deaths).toMatchObject([
			{ unit: a, killer: hero, bounty: 36 },
			{ unit: b, killer: hero, bounty: 45 }
		])
		expect([hero.hero?.gold, hero.hero?.lastHits]).toEqual([81, 2])
	})

	it("walks into its reach of 10, no closer, aimed at an enemy", () => {
		const { w, hero } = setup({ lanes: [waitingLane("dire", 20, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "melee", 20, 4, Facing.west)
		run(w, MAGE_CHARGE)
		hero.mp = 8
		w.command(hero.id, { type: "ability", ability: "fire", target: creep.id })
		until(w, () => creep.hp < 550)
		expect([hero.col, hero.row]).toEqual([10, 4])
		expect(hero.hero?.order.type).toBe("idle")
		run(w, 100)
		expect([hero.col, hero.row]).toEqual([10, 4])
	})
})

describe("Black Mage: Blizzard", () => {
	/** A Dire creep walking east, away from the mage, out of its aggro range. */
	function walker(cast: boolean) {
		const board = openTerrain(60, 9)
		const lane: LaneSetup = {
			team: "dire",
			lane: "mid",
			path: [
				[11.5, 4.5],
				[59.5, 4.5]
			],
			spawner: [12, 4]
		}
		const { w, hero } = setup({ board, lanes: [lane] })
		run(w, MAGE_CHARGE)
		hero.mp = 8
		const creep = w.spawnCreep(w.lanes[0], "melee", 12, 4, Facing.east)
		if (cast) w.command(hero.id, { type: "ability", ability: "blizzard", target: creep.id })
		const log = run(w, 1)
		return { w, creep, log }
	}

	it("chills: 40% slower on foot for 3 s", () => {
		const chilled = walker(true)
		const free = walker(false)
		const { w, creep, log } = chilled
		expect(events(log, "magic").map((e) => e.event.damage)).toEqual([132])
		expect(events(log, "status").map((e) => e.event)).toEqual([
			{ type: "status", unit: creep, status: "chill", until: w.tick - 1 + 3 * TICK_RATE }
		])
		expect(w.walkOf(creep)).toBe(195)
		run(chilled.w, 3 * TICK_RATE - 1)
		run(free.w, 3 * TICK_RATE - 1)
		expect(w.has(creep, "chill")).toBe(false)
		expect(w.walkOf(creep)).toBe(325)
		const went = (c: Unit) => c.col - 12
		expect(went(creep) / went(free.creep)).toBeCloseTo(0.6, 1)
	})
})

describe("Black Mage: Fira", () => {
	function ready() {
		const { w, hero, enemy } = setup({
			enemy: { job: "warrior", hall: [12, 4] },
			lanes: [waitingLane("dire", 12, 6)]
		})
		if (!enemy) throw new Error("no enemy")
		run(w, MAGE_CHARGE)
		hero.mp = 16
		const creep = w.spawnCreep(w.lanes[0], "melee", 12, 6, Facing.west)
		return { w, hero, enemy, creep }
	}

	it("charges 2 s, standing, then lands on the tile it was aimed at: whoever left in time is spared", () => {
		const { w, hero, enemy, creep } = ready()
		w.command(hero.id, { type: "abilityAt", ability: "fira", col: 12, row: 4 })
		w.command(enemy.id, { type: "move", col: 20, row: 4 })
		const cast = w.tick
		const lands = cast + 2 * TICK_RATE
		expect(events(run(w, 1), "charge").map((e) => e.event)).toEqual([
			{ type: "charge", unit: hero, ability: "fira", col: 12, row: 4, lands }
		])
		expect(hero.mp).toBe(10)
		// Ordered to walk off, it stays until the spell lands, then goes.
		w.command(hero.id, { type: "move", col: 3, row: 8 })
		const log: Logged[] = []
		while (w.tick < lands) {
			log.push(...run(w, 1))
			expect([hero.col, hero.row, hero.step]).toEqual([3, 4, null])
		}
		expect(events(log, "spell")).toEqual([])
		const landed = run(w, 1)
		expect(events(landed, "spell").map((e) => e.tick)).toEqual([lands])
		expect(events(landed, "magic").map((e) => [e.event.target, e.event.damage])).toEqual([
			[creep, 300]
		])
		expect(enemy.hp).toBe(JOBS.warrior.stats.hp)
		// It charged the 2 s it stood.
		expect(hero.gauge).toBe(2 * TICK_RATE * MAGE.speed)
		until(w, () => hero.col === 3 && hero.row === 8)
	})

	it("hits a hero standing in it for 293", () => {
		const { w, hero, enemy } = ready()
		w.command(hero.id, { type: "abilityAt", ability: "fira", col: 12, row: 4 })
		const log = run(w, 2 * TICK_RATE + 1)
		expect(events(log, "magic").map((e) => [e.event.target, e.event.damage])).toContainEqual([
			enemy,
			293
		])
		expect(enemy.hp).toBe(JOBS.warrior.stats.hp - 293)
	})

	it("fizzles when the caster dies charging", () => {
		const tower = { team: "dire" as const, tier: 1 as const, entity: "t", col: 14, row: 4 }
		const { w, hero } = setup({ scenario: { structures: [tower] } })
		until(w, () => hero.gauge === GAUGE_FULL)
		const sentinel = w.units.find((u) => u.stats.structure)
		if (!sentinel) throw new Error("no Sentinel")
		// It fires in 10 ticks, into the charge.
		sentinel.gauge = GAUGE_FULL - 10 * sentinel.stats.speed
		hero.hp = 50
		hero.mp = 16
		w.command(hero.id, { type: "abilityAt", ability: "fira", col: 9, row: 4 })
		const log = run(w, 3 * TICK_RATE)
		expect(events(log, "charge")).toHaveLength(1)
		expect(events(log, "death").map((e) => e.event.unit)).toEqual([hero])
		expect(events(log, "spell")).toEqual([])
		expect(hero.casting).toBeNull()
	})
})

describe("Spells and structures", () => {
	it("can't be aimed at a Sentinel, and don't hurt one in their area", () => {
		const tower = { team: "dire" as const, tier: 1 as const, entity: "t", col: 14, row: 4 }
		const { w, hero } = setup({ scenario: { structures: [tower] } })
		const sentinel = w.units.find((u) => u.stats.structure)
		if (!sentinel) throw new Error("no Sentinel")
		run(w, MAGE_CHARGE)
		hero.mp = 8
		for (const ability of ["blizzard", "fire"] as const) {
			w.command(hero.id, { type: "ability", ability, target: sentinel.id })
			run(w, 1)
			expect(hero.hero?.order.type).toBe("idle")
		}
		w.command(hero.id, { type: "abilityAt", ability: "fire", col: 14, row: 4 })
		const log = until(w, () => hero.mp !== 8)
		expect(events(log, "spell")).toHaveLength(1)
		expect(events(log, "magic")).toEqual([])
		expect(sentinel.hp).toBe(sentinel.stats.hp)
	})
})

describe("Warrior: Rend Speed", () => {
	it("slows its target's gauge by 6 for 15 s, then the Warrior attacks it", () => {
		const { w, hero } = setup({ job: "warrior", lanes: [waitingLane("dire", 5, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "melee", 5, 4, Facing.west)
		until(w, () => hero.gauge === GAUGE_FULL)
		hero.mp = 10
		w.command(hero.id, { type: "ability", ability: "rendSpeed", target: creep.id })
		const tick = w.tick
		const log = run(w, 1)
		expect(attacks(log).filter((a) => a.attacker === hero)).toMatchObject([
			{ ability: "rendSpeed", hit: true, damage: 0 }
		])
		expect(events(log, "status").map((e) => e.event)).toEqual([
			{ type: "status", unit: creep, status: "slow", until: tick + 15 * TICK_RATE }
		])
		expect(w.speedOf(creep)).toBe(27)
		expect(hero.hero?.order).toEqual({ type: "attack", target: creep })
		// A charging creep fills 27 a tick.
		creep.gauge = 0
		creep.hp = 10_000
		w.step()
		expect(creep.gauge).toBe(27)
		run(w, 15 * TICK_RATE)
		expect(w.speedOf(creep)).toBe(33)
	})
})

describe("Facing and height (§12)", () => {
	it("takes a blow on the side it comes from", () => {
		// The Radiant Warrior faces north; one creep is east of it, one south.
		const { w, hero } = setup({
			job: "warrior",
			lanes: [waitingLane("dire", 5, 4), waitingLane("dire", 3, 2)]
		})
		const east = w.spawnCreep(w.lanes[0], "melee", 5, 4, Facing.west)
		const south = w.spawnCreep(w.lanes[1], "melee", 3, 2, Facing.north)
		const blows = attacks(run(w, 200)).filter((a) => a.target === hero)
		expect(new Set(blows.filter((a) => a.attacker === east).map((a) => a.side))).toEqual(
			new Set(["side"])
		)
		expect(new Set(blows.filter((a) => a.attacker === south).map((a) => a.side))).toEqual(
			new Set(["back"])
		)
	})

	it("misses a quarter more often uphill", () => {
		/** The hit rate of a creep's blows from behind a Warrior standing `level` above it. */
		function rate(level: number) {
			const board = terrain([".....", `..${String(level)}..`, ".....", "....."])
			const { w, hero } = setup(
				{ job: "warrior", board, hall: [2, 2], lanes: [waitingLane("dire", 2, 1)] },
				7
			)
			hero.hp = 1e9
			w.spawnCreep(w.lanes[0], "melee", 2, 1, Facing.north)
			const blows = attacks(run(w, 400 * 62)).filter((a) => a.target === hero)
			return blows.filter((a) => a.hit).length / blows.length
		}
		expect(rate(0)).toBeCloseTo(0.95, 1)
		expect(rate(1)).toBeCloseTo(0.7, 1)
	})
})

describe("Spells: determinism", () => {
	it("replays the same game from the seed and the command log", () => {
		function game(seed: number) {
			const board = openTerrain(70, 11)
			const { w, hero } = setup(
				{
					board,
					hall: [2, 5],
					lanes: lanes(board),
					scenario: {
						waves: true,
						structures: [
							{ team: "radiant", tier: 1, entity: "r", col: 22, row: 5 },
							{ team: "dire", tier: 1, entity: "d", col: 47, row: 5 }
						]
					}
				},
				seed
			)
			// It starts with MP to spend, and casts from behind its wave.
			hero.mp = MAGE.mp
			const commands: { tick: number; command: Command }[] = [
				{ tick: 0, command: { type: "move", col: 30, row: 5 } },
				{ tick: 20 * TICK_RATE, command: { type: "abilityAt", ability: "fire", col: 36, row: 5 } },
				{ tick: 30 * TICK_RATE, command: { type: "abilityAt", ability: "fira", col: 36, row: 5 } },
				{ tick: 40 * TICK_RATE, command: { type: "abilityAt", ability: "fire", col: 36, row: 4 } }
			]
			const log: Logged[] = []
			for (let i = 0; i < 90 * TICK_RATE; i++) {
				for (const c of commands) if (c.tick === w.tick) w.command(hero.id, c.command)
				log.push(...run(w, 1))
			}
			return log
		}
		const a = game(3)
		expect(trace(game(3))).toBe(trace(a))
		expect(events(a, "magic").length).toBeGreaterThan(0)
	})
})
