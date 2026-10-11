import { describe, expect, it } from "vitest"
import { JOBS, type JobId } from "#lib/content/heroes.ts"
import type { CreepKind, Team } from "#lib/content/units.ts"
import { loadMapFromDisk } from "#lib/testing/map.ts"
import { openTerrain } from "#lib/testing/terrain.ts"
import {
	attacks,
	lanes,
	play,
	testWorld,
	trace,
	until,
	waitingLane,
	type Logged
} from "#lib/testing/world.ts"
import type { Command } from "./commands.ts"
import { GAUGE_FULL, TICK_RATE } from "./constants.ts"
import { Facing } from "./grid.ts"
import { HeroAI } from "./hero-ai.ts"
import { mapScenario, SLICE } from "./scenario.ts"
import { World, type Scenario, type StructureSetup } from "./world.ts"

const BOARD = openTerrain(40, 9)

interface CreepSetup {
	readonly team: Team
	readonly kind?: CreepKind
	readonly col: number
	readonly row: number
	readonly hp?: number
}

/**
 * The slice in miniature on an open 40 × 9 board: both mid lanes along the middle row (Radiant
 * going east), no waves. Heroes start at their halls; `ai` lists the teams whose hero the AI
 * plays. Creeps wait where they're placed.
 */
function arena(
	options: {
		radiant?: JobId | null
		dire?: JobId | null
		halls?: Partial<Record<Team, readonly [number, number]>>
		ai?: readonly Team[]
		creeps?: readonly CreepSetup[]
		structures?: StructureSetup[]
		scenario?: Partial<Scenario>
	},
	seed = 1
) {
	const creeps = options.creeps ?? []
	const heroes = (["radiant", "dire"] as const).flatMap((team) => {
		const job = options[team]
		return job ? [{ team, job }] : []
	})
	const w = testWorld(
		BOARD,
		{
			heroes,
			halls: { radiant: [10, 4], dire: [30, 4], ...options.halls },
			// The AI walks the first lane of its team; each creep gets a lane that ends where it stands.
			lanes: [...lanes(BOARD), ...creeps.map((c) => waitingLane(c.team, c.col, c.row))],
			structures: options.structures ?? [],
			regen: false,
			...options.scenario
		},
		seed
	)
	const placed = creeps.map((c, i) => {
		const unit = w.spawnCreep(w.lanes[2 + i], c.kind ?? "melee", c.col, c.row, Facing.north)
		if (c.hp !== undefined) unit.hp = c.hp
		return unit
	})
	const hero = (team: Team) => w.heroes.find((h) => h.team === team)
	const ais = (options.ai ?? []).flatMap((team) => {
		const unit = hero(team)
		return unit ? [new HeroAI(w, unit)] : []
	})
	return { w, ais, creeps: placed, radiant: hero("radiant"), dire: hero("dire") }
}

const must = <T>(value: T | undefined): T => {
	if (value === undefined) throw new Error("missing")
	return value
}

const TOUGH = 100_000

describe("HeroAI: farming", () => {
	// An enemy Warrior stands 14 tiles off: near enough that the AI farms rather than pushes, too
	// far to fight.
	const watcher = { dire: "warrior", halls: { dire: [24, 4] } } as const

	it("holds its gauge until a blow kills a creep, then last-hits it", () => {
		const { w, ais, creeps, radiant } = arena({
			...watcher,
			radiant: "warrior",
			ai: ["radiant"],
			creeps: [
				{ team: "radiant", col: 13, row: 4, hp: TOUGH },
				{ team: "dire", col: 14, row: 4, hp: 400 }
			]
		})
		const warrior = must(radiant)
		// Enough MP for its abilities, not capped: nothing to spend a held gauge on.
		warrior.mp = 20
		const creep = creeps[1]
		const log = until(w, () => !creep.alive, 2000, ais)
		const blows = attacks(log).filter((a) => a.attacker === warrior)
		expect(blows.length).toBeGreaterThan(0)
		expect(blows.every((a) => a.target === creep)).toBe(true)
		// The creep's HP when the Warrior struck: what the other creep had left it.
		const dealt = attacks(log)
			.filter((a) => a.target === creep && a.attacker !== warrior && a.tick < blows[0].tick)
			.reduce((sum, a) => sum + a.damage, 0)
		expect(400 - dealt).toBeLessThanOrEqual(178)
		expect(warrior.hero?.lastHits).toBe(1)
	})

	it("denies its own creep when a blow kills it", () => {
		const { w, ais, radiant } = arena({
			...watcher,
			radiant: "warrior",
			ai: ["radiant"],
			creeps: [{ team: "radiant", col: 12, row: 4, hp: 150 }]
		})
		const warrior = must(radiant)
		warrior.mp = 20
		until(w, () => warrior.hero?.denies === 1, 400, ais)
		expect(ais[0].intent).toBe("deny")
	})

	it("casts Fire where it kills, and holds it where it wouldn't", () => {
		const weak = arena({
			...watcher,
			radiant: "blackMage",
			ai: ["radiant"],
			creeps: [
				{ team: "dire", col: 19, row: 4, hp: 150 },
				{ team: "dire", col: 19, row: 5, hp: 150 }
			]
		})
		const mage = must(weak.radiant)
		mage.mp = 8
		const log = until(weak.w, () => mage.hero?.lastHits === 2, 400, weak.ais)
		const spells = log.flatMap(({ event }) => (event.type === "spell" ? [event] : []))
		expect(spells.map((e) => e.ability)).toEqual(["fire"])

		const strong = arena({
			...watcher,
			radiant: "blackMage",
			ai: ["radiant"],
			creeps: [{ team: "dire", col: 19, row: 4 }]
		})
		must(strong.radiant).mp = 8
		const waited = play(strong.w, strong.ais, Math.ceil(GAUGE_FULL / 18) + TICK_RATE)
		expect(waited.some(({ event }) => event.type === "spell")).toBe(false)
	})
})

describe("HeroAI: staying alive", () => {
	it("uses First Aid when hurt", () => {
		const { w, ais, radiant } = arena({ radiant: "warrior", ai: ["radiant"] })
		const warrior = must(radiant)
		warrior.hp = 400
		until(w, () => warrior.hp > 400, 400, ais)
		expect(warrior.hp).toBe(625)
		expect(ais[0].intent).toBe("mend")
	})

	it("walks home to its Clan Hall at low HP, heals there, and comes back", () => {
		const { w, ais, radiant } = arena({
			radiant: "blackMage",
			ai: ["radiant"],
			halls: { radiant: [2, 4] },
			creeps: [
				{ team: "radiant", col: 30, row: 4, hp: TOUGH },
				{ team: "dire", col: 31, row: 4, hp: TOUGH }
			],
			scenario: { regen: true }
		})
		const mage = must(radiant)
		const [ai] = ais
		until(w, () => mage.col >= 20 && mage.step === null, 1000, ais)
		mage.hp = 100
		until(w, () => ai.intent === "retreat", 20, ais)
		until(w, () => mage.hp >= 0.9 * JOBS.blackMage.stats.hp, 1000, ais)
		expect(mage.col).toBeLessThanOrEqual(2 + 12)
		until(w, () => mage.col >= 20, 1000, ais)
		expect(ai.intent).toBe("lane")
	})

	it("walks out of a charged spell's area before it lands", () => {
		const { w, ais, radiant, dire } = arena({
			radiant: "warrior",
			dire: "blackMage",
			ai: ["radiant"],
			halls: { radiant: [10, 4], dire: [18, 4] }
		})
		const warrior = must(radiant)
		const mage = must(dire)
		mage.gauge = GAUGE_FULL
		mage.mp = 16
		w.command(mage.id, { type: "abilityAt", ability: "fira", col: 10, row: 4 })
		const log = play(w, ais, 3 * TICK_RATE)
		expect(log.some(({ event }) => event.type === "charge")).toBe(true)
		expect(log.some(({ event }) => event.type === "spell")).toBe(true)
		expect(log.some(({ event }) => event.type === "magic" && event.target === warrior)).toBe(false)
	})

	it("keeps a caster out of an enemy Sentinel's reach, even while its creeps hold it", () => {
		const { w, ais, radiant } = arena({
			radiant: "blackMage",
			ai: ["radiant"],
			halls: { radiant: [6, 4] },
			structures: [{ team: "dire", tier: 1, entity: "t", col: 30, row: 4 }],
			creeps: [
				{ team: "radiant", col: 24, row: 4, hp: TOUGH },
				{ team: "radiant", col: 25, row: 4, hp: TOUGH },
				{ team: "dire", col: 26, row: 4, hp: TOUGH }
			]
		})
		const mage = must(radiant)
		const tower = must(w.units.find((u) => u.stats.structure))
		let nearest = Infinity
		for (let i = 0; i < 20 * TICK_RATE; i++) {
			play(w, ais, 1)
			nearest = Math.min(
				nearest,
				Math.abs(mage.col - tower.col) - 1 + Math.abs(mage.row - tower.row)
			)
		}
		expect(mage.col).toBeGreaterThan(10)
		expect(nearest).toBeGreaterThan(tower.stats.reach)
	})
})

describe("HeroAI: fighting the enemy hero", () => {
	/** The Radiant hero (the AI's) at (10, 4) and the Dire one, standing, 11 tiles east. */
	function facing(radiant: JobId, dire: JobId) {
		const {
			w,
			ais,
			radiant: ours,
			dire: theirs
		} = arena({
			radiant,
			dire,
			ai: ["radiant"],
			halls: { radiant: [10, 4], dire: [21, 4] }
		})
		return { w, ais, ours: must(ours), theirs: must(theirs) }
	}

	it("sends the Warrior at a mage in reach of a dash, once its gauge is full", () => {
		const { w, ais, theirs: mage } = facing("warrior", "blackMage")
		until(w, () => mage.hp < JOBS.blackMage.stats.hp, 600, ais)
		expect(["trade", "kill"]).toContain(ais[0].intent)
	})

	it("keeps a hurt Warrior off the mage", () => {
		const { w, ais, ours: warrior, theirs: mage } = facing("warrior", "blackMage")
		// Over First Aid's threshold, under the one for going in.
		warrior.hp = 500
		const log = play(w, ais, 10 * TICK_RATE)
		expect(attacks(log).some((a) => a.target === mage)).toBe(false)
	})

	it("has a mage chill a Warrior coming for it, and back away", () => {
		const { w, ais, ours: mage, theirs: warrior } = facing("blackMage", "warrior")
		// Behind on HP, so it isn't trading Fires; just keeping the Warrior off.
		mage.hp = 400
		mage.mp = 8
		play(w, ais, Math.ceil(GAUGE_FULL / JOBS.blackMage.stats.speed))
		w.command(warrior.id, { type: "attack", target: mage.id })
		until(w, () => w.has(warrior, "chill"), 400, ais)
		expect(ais[0].intent).toBe("evade")
		const from = mage.col
		until(w, () => mage.col <= from - 2, 200, ais)
	})
})

describe("HeroAI: replays", () => {
	/** Both heroes played by the AI on the test board, waves on, for `seconds`. */
	function game(
		seed: number,
		seconds: number,
		commands?: { tick: number; hero: number; command: Command }[]
	) {
		const { w, ais } = arena(
			{
				radiant: "warrior",
				dire: "blackMage",
				ai: commands ? [] : ["radiant", "dire"],
				halls: { radiant: [2, 4], dire: [37, 4] },
				scenario: { waves: true }
			},
			seed
		)
		const log: Logged[] = []
		const issued: { tick: number; hero: number; command: Command }[] = []
		const command = w.command.bind(w)
		w.command = (hero, c) => {
			issued.push({ tick: w.tick, hero, command: c })
			command(hero, c)
		}
		for (let i = 0; i < seconds * TICK_RATE; i++) {
			for (const c of commands ?? []) if (c.tick === w.tick) w.command(c.hero, c.command)
			log.push(...play(w, ais, 1))
		}
		return { trace: trace(log), issued }
	}

	it("plays the same game from the same seed, and again from its command log alone", () => {
		const first = game(3, 60)
		expect(first.issued.length).toBeGreaterThan(10)
		expect(game(3, 60).trace).toBe(first.trace)
		expect(game(3, 60, first.issued).trace).toBe(first.trace)
	})
})

describe("HeroAI on the real map", () => {
	it("takes both heroes to mid, where they farm", () => {
		const world = new World(mapScenario(loadMapFromDisk(), SLICE), 1)
		const ais = world.heroes.map((unit) => new HeroAI(world, unit))
		play(world, ais, 3 * 60 * TICK_RATE)
		for (const unit of world.heroes) {
			const hero = must(unit.hero ?? undefined)
			expect(hero.lastHits + hero.denies).toBeGreaterThan(0)
			const [col, row] = hero.hall
			expect(Math.abs(unit.col - col) + Math.abs(unit.row - row)).toBeGreaterThan(60)
		}
	})
})
