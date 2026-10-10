import { describe, expect, it } from "vitest"
import { JOBS } from "#lib/content/heroes.ts"
import { CREEPS } from "#lib/content/units.ts"
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
import { GAUGE_FULL, STEP_FULL, TICK_RATE } from "./constants.ts"
import { Facing, type Terrain } from "./grid.ts"
import type { Unit } from "./unit.ts"
import type { LaneSetup, Scenario, World } from "./world.ts"

const WARRIOR = JOBS.warrior.stats
/** Ticks for a speed-20 gauge to fill from empty. */
const CHARGE = GAUGE_FULL / WARRIOR.speed

/** A world with the Radiant Warrior at a Clan Hall, and lanes whose creeps wait where placed. */
function setup(
	options: {
		board?: Terrain
		hall?: readonly [number, number]
		lanes?: LaneSetup[]
		scenario?: Partial<Scenario>
	} = {},
	seed = 1
): { w: World; hero: Unit } {
	const board = options.board ?? openTerrain(30, 9)
	const w = testWorld(
		board,
		{
			heroes: [{ team: "radiant", job: "warrior" }],
			halls: { radiant: options.hall ?? [3, 4] },
			lanes: options.lanes ?? lanes(board),
			...options.scenario
		},
		seed
	)
	return { w, hero: w.heroes[0] }
}

const by = (unit: Unit, log: readonly Logged[]) => attacks(log).filter((a) => a.attacker === unit)

describe("Hero: setup", () => {
	it("starts on its Clan Hall's tile, idle, with no MP and an empty gauge", () => {
		const { w, hero } = setup()
		expect([hero.col, hero.row]).toEqual([3, 4])
		expect(hero.hero?.order).toEqual({ type: "idle" })
		expect([hero.hp, hero.mp, hero.gauge]).toEqual([WARRIOR.hp, 0, 0])
		expect(w.units).toContain(hero)
	})

	it("starts on the nearest free tile when the hall's own isn't walkable", () => {
		const board = terrain(["....", ".##.", "...."])
		const { hero } = setup({ board, hall: [1, 1], lanes: [] })
		expect([hero.col, hero.row]).toEqual([1, 2])
	})
})

describe("Hero: the gauge", () => {
	it("charges while standing and holds full; idle, it never attacks a creep in reach", () => {
		const { w, hero } = setup({ lanes: [waitingLane("dire", 5, 4)] })
		w.spawnCreep(w.lanes[0], "melee", 5, 4, Facing.west)
		const log = run(w, 300)
		expect(hero.gauge).toBe(GAUGE_FULL)
		expect(by(hero, log)).toEqual([])
		// The creep fights it all the same.
		expect(attacks(log).some((a) => a.target === hero)).toBe(true)
	})

	it("walks at Move 4's 300 u/s with the gauge paused, not reset", () => {
		const { w, hero } = setup()
		run(w, 40)
		expect(hero.gauge).toBe(40 * WARRIOR.speed)
		w.command(hero.id, { type: "move", col: 13, row: 4 })
		// The first step starts on the command's tick; 10 tiles take ⌈10 × 1280 / 300⌉ ticks more.
		const arrives = 40 + Math.ceil((10 * STEP_FULL) / WARRIOR.walk)
		while (w.tick <= arrives - 1) {
			w.step()
			expect(hero.gauge).toBe(40 * WARRIOR.speed)
		}
		expect(hero.col).toBe(12)
		w.step()
		expect([hero.col, hero.row]).toEqual([13, 4])
		expect(hero.hero?.order.type).toBe("idle")
		// Arriving, it stands and charges on the same tick.
		expect(hero.gauge).toBe(41 * WARRIOR.speed)
	})

	it("walks round walls by a shortest way", () => {
		const board = terrain([
			"..........", //
			"....#.....",
			"....#.....",
			"....#....."
		])
		const { w, hero } = setup({ board, hall: [0, 0], lanes: [] })
		w.command(hero.id, { type: "move", col: 9, row: 0 })
		until(w, () => hero.hero?.order.type === "idle" && !hero.step, 400)
		expect([hero.col, hero.row]).toEqual([9, 0])
		// Up 3, across 9, down 3: 15 steps at 300 u/s.
		expect(w.tick).toBe(Math.ceil((15 * STEP_FULL) / WARRIOR.walk) + 1)
	})
})

describe("Hero: attack orders", () => {
	it("walks into reach, hits the moment the gauge fills, and repeats every 5 s", () => {
		const { w, hero } = setup({ lanes: [waitingLane("dire", 12, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "melee", 12, 4, Facing.west)
		w.command(hero.id, { type: "attack", target: creep.id })
		let stopped = -1
		const log: Logged[] = []
		while (creep.alive && w.tick < 2000) {
			log.push(...run(w, 1))
			if (stopped < 0 && !hero.step) stopped = w.tick - 1
		}
		const hits = by(hero, log)
		expect(hits[0].tick).toBe(stopped + CHARGE - 1)
		for (let i = 1; i < hits.length; i++) expect(hits[i].tick - hits[i - 1].tick).toBe(CHARGE)
		// 180 − 4/2 a hit; 550 HP takes 4.
		expect(hits.every((a) => a.damage === (a.hit ? 178 : 0))).toBe(true)
		expect(hits.filter((a) => a.hit)).toHaveLength(4)
		// The order ends the tick after its target died.
		run(w, 1)
		expect(hero.hero?.order.type).toBe("idle")
	})

	it("acts on the order's own tick when it's in reach with a full gauge", () => {
		const { w, hero } = setup({ lanes: [waitingLane("dire", 5, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "melee", 5, 4, Facing.west)
		run(w, CHARGE)
		expect(hero.gauge).toBe(GAUGE_FULL)
		w.command(hero.id, { type: "attack", target: creep.id })
		const tick = w.tick
		expect(by(hero, run(w, 1)).map((a) => a.tick)).toEqual([tick])
		expect(hero.gauge).toBe(0)
	})

	it("faces its target", () => {
		const { w, hero } = setup({ lanes: [waitingLane("dire", 3, 6)] })
		const creep = w.spawnCreep(w.lanes[0], "melee", 3, 6, Facing.south)
		w.command(hero.id, { type: "attack", target: creep.id })
		run(w, 1)
		expect(hero.facing).toBe(Facing.north)
	})

	it("attack-moves: fights what it meets on the way, then walks on", () => {
		const { w, hero } = setup({ lanes: [waitingLane("dire", 14, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "ranged", 14, 4, Facing.west)
		w.command(hero.id, { type: "attackMove", col: 25, row: 4 })
		const log = until(w, () => hero.hero?.order.type === "idle" && !hero.step)
		expect(creep.alive).toBe(false)
		expect(by(hero, log).every((a) => a.target === creep)).toBe(true)
		expect([hero.col, hero.row]).toEqual([25, 4])
	})
})

describe("Hero: walking through allies", () => {
	const corridor = terrain(["#########", ".........", "#########"])

	it("passes through an allied creep, never stopping on it", () => {
		const { w, hero } = setup({
			board: corridor,
			hall: [0, 1],
			lanes: [waitingLane("radiant", 4, 1), waitingLane("dire", 8, 1)]
		})
		const ally = w.spawnCreep(w.lanes[0], "melee", 4, 1, Facing.east)
		w.command(hero.id, { type: "move", col: 8, row: 1 })
		for (let i = 0; i < 80; i++) {
			w.step()
			expect(w.unitAt(4, 1)).toBe(ally)
			if (hero.col === 4) expect(hero.step).not.toBeNull()
		}
		expect([hero.col, hero.row]).toEqual([8, 1])
		expect([ally.col, ally.row]).toEqual([4, 1])
	})

	it("stops beside an ally when ordered onto its tile", () => {
		const { w, hero } = setup({
			board: corridor,
			hall: [0, 1],
			lanes: [waitingLane("radiant", 4, 1), waitingLane("dire", 8, 1)]
		})
		w.spawnCreep(w.lanes[0], "melee", 4, 1, Facing.east)
		w.command(hero.id, { type: "move", col: 4, row: 1 })
		until(w, () => hero.hero?.order.type === "idle" && !hero.step)
		expect([hero.col, hero.row]).toEqual([3, 1])
	})

	it("can't walk through an enemy", () => {
		const { w, hero } = setup({
			board: corridor,
			hall: [0, 1],
			lanes: [waitingLane("radiant", 0, 1), waitingLane("dire", 8, 1)]
		})
		const enemy = w.spawnCreep(w.lanes[1], "melee", 8, 1, Facing.west)
		w.command(hero.id, { type: "move", col: 8, row: 1 })
		for (let i = 0; i < 200; i++) {
			w.step()
			expect(hero.col).toBeLessThan(enemy.col)
		}
	})
})

describe("Hero: last hits and denies", () => {
	it("earns a creep's bounty for the killing blow", () => {
		const { w, hero } = setup({ lanes: [waitingLane("dire", 5, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "melee", 5, 4, Facing.west)
		creep.hp = 150
		w.command(hero.id, { type: "attack", target: creep.id })
		const log = until(w, () => !creep.alive)
		const death = log.find(({ event }) => event.type === "death")?.event
		expect(death).toEqual({
			type: "death",
			unit: creep,
			killer: hero,
			bounty: CREEPS.melee.bounty,
			denied: false
		})
		expect(hero.hero?.gold).toBe(36)
		expect(hero.hero?.lastHits).toBe(1)
	})

	it("denies its own creep only under half HP, for no gold", () => {
		const { w, hero } = setup({ lanes: [waitingLane("radiant", 5, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "melee", 5, 4, Facing.west)
		creep.hp = 300
		w.command(hero.id, { type: "attack", target: creep.id })
		run(w, 1)
		expect(hero.hero?.order.type).toBe("move")
		creep.hp = 200
		w.command(hero.id, { type: "attack", target: creep.id })
		const log = until(w, () => !creep.alive)
		const death = log.find(({ event }) => event.type === "death")?.event
		expect(death).toMatchObject({ killer: hero, bounty: 0, denied: true })
		expect(hero.hero?.denies).toBe(1)
		expect(hero.hero?.gold).toBe(0)
	})
})

describe("Hero: abilities", () => {
	it("First Aid heals 25% of max HP, capped at full", () => {
		const { w, hero } = setup()
		hero.hp = 500
		run(w, CHARGE)
		w.command(hero.id, { type: "ability", ability: "firstAid", target: null })
		const log = run(w, 1)
		expect(log.map(({ event }) => event)).toContainEqual({
			type: "heal",
			unit: hero,
			ability: "firstAid",
			amount: 225
		})
		expect([hero.hp, hero.gauge, hero.mp]).toEqual([725, 0, 10])
		hero.hp = 800
		run(w, CHARGE)
		w.command(hero.id, { type: "ability", ability: "firstAid", target: null })
		run(w, 1)
		expect(hero.hp).toBe(900)
	})

	it("waits for a full gauge, standing, then goes back to what it was doing", () => {
		const { w, hero } = setup()
		hero.hp = 500
		w.command(hero.id, { type: "move", col: 25, row: 4 })
		run(w, 10)
		w.command(hero.id, { type: "ability", ability: "firstAid", target: null })
		// It finishes the step it's on, then stands until the gauge is full.
		let stopped = -1
		const log: Logged[] = []
		while (hero.hp === 500 && w.tick < 1000) {
			log.push(...run(w, 1))
			if (stopped < 0 && !hero.step) stopped = w.tick - 1
			if (stopped >= 0) expect(hero.step).toBeNull()
		}
		const heal = log.find(({ event }) => event.type === "heal")
		expect(heal?.tick).toBe(stopped + CHARGE - 1)
		expect(hero.hero?.order).toEqual({ type: "move", col: 25, row: 4 })
		until(w, () => hero.col === 25)
	})

	it("Body Slam hits for ATK × 1.6 and recoils 10% on the caster, for 20 MP", () => {
		const { w, hero } = setup({ lanes: [waitingLane("dire", 5, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "melee", 5, 4, Facing.west)
		run(w, CHARGE)
		const slam: Command = { type: "ability", ability: "bodySlam", target: creep.id }
		hero.mp = 10
		w.command(hero.id, slam)
		run(w, 1)
		expect(hero.hero?.order.type).toBe("idle")
		hero.mp = 20
		w.command(hero.id, slam)
		const events = run(w, 1).map(({ event }) => event)
		const hit = events.find((e) => e.type === "attack" && e.attacker === hero)
		expect(hit).toMatchObject({ ability: "bodySlam", hit: true, damage: 286 })
		expect(events).toContainEqual({ type: "recoil", unit: hero, damage: 28 })
		expect(hero.mp).toBe(10)
		expect(hero.hero?.order).toEqual({ type: "attack", target: creep })
	})

	it("gains 10 MP an action, up to its 40", () => {
		const { w, hero } = setup({ lanes: [waitingLane("dire", 5, 4)] })
		const creep = w.spawnCreep(w.lanes[0], "melee", 5, 4, Facing.west)
		creep.hp = 10_000
		w.command(hero.id, { type: "attack", target: creep.id })
		const mp: number[] = []
		while (mp.length < 6) if (by(hero, run(w, 1)).length > 0) mp.push(hero.mp)
		expect(mp).toEqual([10, 20, 30, 40, 40, 40])
	})
})

describe("Hero: death", () => {
	it("dies, leaves the board and respawns at its hall after 13 s, as the same unit", () => {
		// Its reach (11) covers col 13 on; the hall is out of it.
		const tower = { team: "dire" as const, tier: 1 as const, entity: "t", col: 25, row: 4 }
		const { w, hero } = setup({ scenario: { structures: [tower] } })
		hero.hp = 100
		w.command(hero.id, { type: "move", col: 15, row: 4 })
		const log = until(w, () => !hero.alive)
		const died = log.at(-1)?.tick ?? -1
		expect(w.units).not.toContain(hero)
		expect(w.unitAt(3, 4)).toBeUndefined()
		const back = until(w, () => hero.alive, 400)
		const spawn = back.find(({ event }) => event.type === "spawn")
		expect(spawn?.tick).toBe(died + 13 * TICK_RATE)
		expect([hero.col, hero.row, hero.hp, hero.mp]).toEqual([3, 4, WARRIOR.hp, 0])
		expect(hero.hero?.order.type).toBe("idle")
		expect(w.units.map((u) => u.id)).toEqual([...w.units.map((u) => u.id)].sort((a, b) => a - b))
	})
})

describe("Creeps and heroes", () => {
	it("creeps go for enemy creeps before heroes", () => {
		const { w } = setup({
			hall: [10, 4],
			lanes: [waitingLane("radiant", 16, 4), waitingLane("dire", 12, 4)]
		})
		const radiant = w.spawnCreep(w.lanes[0], "melee", 16, 4, Facing.west)
		const dire = w.spawnCreep(w.lanes[1], "melee", 12, 4, Facing.west)
		w.step()
		expect(dire.target).toBe(radiant)
	})

	it("creeps fight a hero when it's all there is", () => {
		const { w, hero } = setup({ hall: [10, 4], lanes: [waitingLane("dire", 12, 4)] })
		const dire = w.spawnCreep(w.lanes[0], "melee", 12, 4, Facing.west)
		w.step()
		expect(dire.target).toBe(hero)
	})
})

describe("Hero: determinism", () => {
	/** A lane with waves and a hero who's ordered about. */
	function game(seed: number, commands: readonly { tick: number; command: Command }[]) {
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
		const log: Logged[] = []
		for (let i = 0; i < 90 * TICK_RATE; i++) {
			for (const c of commands) if (c.tick === w.tick) w.command(hero.id, c.command)
			log.push(...run(w, 1))
		}
		return { w, hero, log }
	}

	const commands = [
		{ tick: 0, command: { type: "attackMove", col: 40, row: 5 } },
		{ tick: 30 * TICK_RATE, command: { type: "ability", ability: "firstAid", target: null } },
		{ tick: 50 * TICK_RATE, command: { type: "move", col: 10, row: 2 } },
		{ tick: 60 * TICK_RATE, command: { type: "attackMove", col: 45, row: 5 } }
	] as const satisfies readonly { tick: number; command: Command }[]

	it("replays the same game from the seed and the command log", () => {
		const a = game(5, commands)
		const b = game(5, commands)
		expect(trace(b.log)).toBe(trace(a.log))
		expect(by(a.hero, a.log).length).toBeGreaterThan(0)
	})

	it("never puts two units on one tile, but for a hero passing an ally", () => {
		// A narrow lane; sent in behind its own wave, the hero passes through it to the fight.
		const board = openTerrain(70, 5)
		const { w, hero } = setup({ board, hall: [2, 2], scenario: { waves: true } }, 5)
		let passing = 0
		for (let i = 0; i < 90 * TICK_RATE; i++) {
			if (w.tick === 15 * TICK_RATE) w.command(hero.id, { type: "attackMove", col: 60, row: 2 })
			w.step()
			const claimed = new Map<string, Unit>()
			for (const u of w.units) {
				const r = u.stats.radius
				const tiles: [number, number][] = []
				for (let dr = -r; dr <= r; dr++)
					for (let dc = -r; dc <= r; dc++) tiles.push([u.col + dc, u.row + dr])
				if (u.step) tiles.push([u.step.col, u.step.row])
				for (const [c, row] of tiles) {
					const key = `${String(c)},${String(row)}`
					const other = claimed.get(key)
					if (other) {
						const ally = (u.hero !== null || other.hero !== null) && u.team === other.team
						expect(ally, `tick ${String(w.tick)} tile ${key}`).toBe(true)
						passing++
					}
					claimed.set(key, u)
				}
			}
		}
		expect(passing).toBeGreaterThan(0)
	})
})
