import { TUNING } from "#lib/content/tuning.ts"
import { CREEP_NAMES, CREEPS, SENTINELS, type CreepKind, type Team } from "#lib/content/units.ts"
import { hitChance, physicalDamage } from "./combat.ts"
import { GAUGE_FULL, STEP_FULL, TICK_RATE, ticks } from "./constants.ts"
import type { SimEvent } from "./events.ts"
import {
	DIRECTIONS,
	exposure,
	Facing,
	facingToward,
	footprintDistance,
	inside,
	isWalkable,
	tileIndex,
	type Terrain
} from "./grid.ts"
import { LaneField, UNREACHABLE, type TilePoint } from "./lane-field.ts"
import { Random } from "./random.ts"
import { LocalSearch } from "./search.ts"
import { Unit, type Lane, type LaneName, type UnitInit } from "./unit.ts"

/** A lane to run: whose creeps walk it, along what path, from where. */
export interface LaneSetup {
	readonly team: Team
	readonly lane: LaneName
	/** In tile coordinates, from the spawner's end to the enemy's. */
	readonly path: readonly TilePoint[]
	readonly spawner: readonly [col: number, row: number]
}

/** A Sentinel to place. */
export interface StructureSetup {
	readonly team: Team
	readonly tier: 1 | 2 | 3 | 4
	/** The map entity it stands for, by name. */
	readonly entity: string
	readonly col: number
	readonly row: number
}

/** Everything a world starts from. */
export interface Scenario {
	readonly terrain: Terrain
	readonly lanes: readonly LaneSetup[]
	readonly structures: readonly StructureSetup[]
	/** Whether waves spawn (default true); tests turn them off and place creeps themselves. */
	readonly waves?: boolean
}

/** How far (tiles) a unit looks for a way to reach its target. */
const SEARCH_LIMIT = 16

const WAVE: readonly CreepKind[] = ["melee", "melee", "melee", "ranged"]

/**
 * The simulation: a fixed-rate, deterministic world of units on the map's tiles. `step()` advances
 * one tick. Units act in id order; all randomness comes from the world's seeded generator.
 */
export class World {
	readonly terrain: Terrain
	readonly random: Random
	readonly lanes: readonly Lane[]
	/** The tick `step()` runs next; the time is `tick / TICK_RATE` seconds. */
	tick = 0
	/** The living units, in id order. */
	units: Unit[] = []

	readonly #paths: ReadonlyMap<Lane, readonly TilePoint[]>
	/** Per tile: the id of the unit standing on (or stepping onto) it; 0 when free. */
	readonly #occupant: Int32Array
	/** Per tile: 1 inside a living structure's footprint. */
	readonly #footprints: Uint8Array
	readonly #search = new LocalSearch(SEARCH_LIMIT)
	readonly #waves: boolean
	#nextId = 1
	#events: SimEvent[] = []

	constructor(scenario: Scenario, seed: number) {
		const { terrain } = scenario
		this.terrain = terrain
		this.random = new Random(seed)
		this.#waves = scenario.waves ?? true
		this.#occupant = new Int32Array(terrain.cols * terrain.rows)
		this.#footprints = new Uint8Array(terrain.cols * terrain.rows)

		for (const s of scenario.structures) {
			const unit = this.#add({
				team: s.team,
				stats: SENTINELS[s.tier],
				name: `Sentinel T${String(s.tier)}`,
				col: s.col,
				row: s.row,
				facing: Facing.north,
				entity: s.entity
			})
			this.#forFootprint(unit, (i) => {
				this.#occupant[i] = unit.id
				this.#footprints[i] = 1
			})
		}

		const paths = new Map<Lane, readonly TilePoint[]>()
		this.lanes = scenario.lanes.map((setup) => {
			const lane: Lane = {
				team: setup.team,
				name: setup.lane,
				spawner: setup.spawner,
				field: this.#field(setup.path)
			}
			paths.set(lane, setup.path)
			return lane
		})
		this.#paths = paths
	}

	/** Seconds since the game started. */
	get time(): number {
		return this.tick / TICK_RATE
	}

	/** The unit standing on (or stepping onto) a tile. */
	unitAt(col: number, row: number): Unit | undefined {
		if (!inside(this.terrain, col, row)) return undefined
		const id = this.#occupant[tileIndex(this.terrain, col, row)]
		return id === 0 ? undefined : this.units.find((u) => u.id === id)
	}

	/** Advances one tick; returns what happened in it (and since the last step). */
	step(): SimEvent[] {
		if (this.#waves && this.tick % ticks(TUNING.waveInterval) === 0) {
			this.#spawnWaves(Math.floor(this.tick / ticks(TUNING.waveInterval)))
		}
		for (const unit of this.units) {
			if (!unit.alive) continue
			if (unit.stats.walk === 0) this.#structureTurn(unit)
			else this.#creepTurn(unit)
		}
		this.units = this.units.filter((u) => u.alive)
		this.tick++
		const events = this.#events
		this.#events = []
		return events
	}

	/**
	 * Places a creep of a lane's team on a free tile, outside any wave. Its events come with the
	 * next `step()`.
	 */
	spawnCreep(lane: Lane, kind: CreepKind, col: number, row: number, facing: Facing): Unit {
		if (!this.#canEnter(col, row)) throw new Error(`can't place a creep on ${String([col, row])}`)
		const unit = this.#add({
			team: lane.team,
			stats: CREEPS[kind],
			name: CREEP_NAMES[lane.team][kind],
			col,
			row,
			facing,
			lane
		})
		this.#occupant[tileIndex(this.terrain, col, row)] = unit.id
		return unit
	}

	// Setup

	#add(init: UnitInit): Unit {
		const unit = new Unit(this.#nextId++, init)
		this.units.push(unit)
		this.#events.push({ type: "spawn", unit })
		return unit
	}

	#field(path: readonly TilePoint[]): LaneField {
		return new LaneField(this.terrain, path, TUNING.laneCorridor, this.#footprints)
	}

	#forFootprint(unit: Unit, f: (index: number) => void) {
		const r = unit.stats.radius
		for (let row = unit.row - r; row <= unit.row + r; row++) {
			for (let col = unit.col - r; col <= unit.col + r; col++) {
				if (inside(this.terrain, col, row)) f(tileIndex(this.terrain, col, row))
			}
		}
	}

	#spawnWaves(wave: number) {
		const siege = wave % TUNING.siegeEvery === TUNING.siegeEvery - 1
		const kinds = siege ? [...WAVE, "siege" as const] : WAVE
		for (const lane of this.lanes) {
			const tiles = this.#freeTilesNear(lane.spawner[0], lane.spawner[1], kinds.length)
			const path = this.#paths.get(lane) ?? []
			const ahead = path[1] ?? path[0]
			kinds.forEach((kind, i) => {
				const [col, row] = tiles[i]
				const unit = this.#add({
					team: lane.team,
					stats: CREEPS[kind],
					name: CREEP_NAMES[lane.team][kind],
					col,
					row,
					facing: facingToward(ahead[0] - col, ahead[1] - row, Facing.north),
					lane,
					wave
				})
				this.#occupant[tileIndex(this.terrain, col, row)] = unit.id
			})
		}
	}

	/** The `count` free walkable tiles nearest a tile, nearest first (breadth-first). */
	#freeTilesNear(col: number, row: number, count: number): [number, number][] {
		const found: [number, number][] = []
		const seen = new Set<number>([tileIndex(this.terrain, col, row)])
		const queue: [number, number][] = [[col, row]]
		for (let head = 0; head < queue.length && found.length < count; head++) {
			const [c, r] = queue[head]
			if (isWalkable(this.terrain, c, r) && this.#isFree(c, r)) found.push([c, r])
			for (const { dc, dr } of DIRECTIONS) {
				const nc = c + dc
				const nr = r + dr
				if (!inside(this.terrain, nc, nr)) continue
				const i = tileIndex(this.terrain, nc, nr)
				if (seen.has(i)) continue
				seen.add(i)
				queue.push([nc, nr])
			}
		}
		if (found.length < count) throw new Error("no room to spawn a wave")
		return found
	}

	// Turns

	#structureTurn(unit: Unit) {
		this.#charge(unit, 100)
		const current = unit.target
		unit.target =
			current?.alive && this.#distance(unit, current) <= unit.stats.reach ?
				current
			:	this.#nearestEnemy(unit, unit.stats.reach, true)
		if (unit.target && unit.gauge >= GAUGE_FULL) this.#attack(unit, unit.target)
	}

	#creepTurn(unit: Unit) {
		const step = unit.step
		if (step) {
			step.progress += unit.stats.walk
			this.#charge(unit, TUNING.walkCharge)
			if (step.progress < STEP_FULL) return
			const carry = step.progress - STEP_FULL
			this.#arrive(unit)
			this.#decide(unit, carry)
		} else {
			this.#decide(unit, 0)
		}
	}

	/** A standing creep's choice: fight, close in, walk the lane, or wait (and charge). */
	#decide(unit: Unit, carry: number) {
		const target = this.#creepTarget(unit)
		unit.target = target
		if (target) {
			if (this.#distance(unit, target) <= unit.stats.reach) {
				unit.facing = facingToward(target.col - unit.col, target.row - unit.row, unit.facing)
				this.#charge(unit, 100)
				if (unit.gauge >= GAUGE_FULL) this.#attack(unit, target)
				return
			}
			if (this.#stepToward(unit, target, carry)) return
		} else if (this.#stepAlongLane(unit, carry)) {
			return
		}
		this.#charge(unit, 100)
	}

	/**
	 * A creep's target (DESIGN.md §6): it keeps the one it has while that's in aggro range, unless
	 * it's a structure and an enemy unit has come into range; otherwise the nearest enemy in range,
	 * units before structures.
	 */
	#creepTarget(unit: Unit): Unit | null {
		const { aggro } = unit.stats
		const current = unit.target
		if (current?.alive && this.#distance(unit, current) <= aggro) {
			if (!current.stats.structure) return current
			return this.#nearestEnemy(unit, aggro, true) ?? current
		}
		return this.#nearestEnemy(unit, aggro, true) ?? this.#nearestEnemy(unit, aggro, false)
	}

	/** The nearest living enemy within `range` (ties to the lowest id); only non-structures if asked. */
	#nearestEnemy(unit: Unit, range: number, unitsOnly: boolean): Unit | null {
		let best: Unit | null = null
		let bestDistance = Infinity
		for (const other of this.units) {
			if (!other.alive || other.team === unit.team) continue
			if (unitsOnly && other.stats.structure) continue
			const d = this.#distance(unit, other)
			if (d <= range && d < bestDistance) {
				best = other
				bestDistance = d
			}
		}
		return best
	}

	#distance(a: Unit, b: Unit): number {
		return footprintDistance(a.col, a.row, a.stats.radius, b.col, b.row, b.stats.radius)
	}

	// Movement

	#isFree(col: number, row: number): boolean {
		return this.#occupant[tileIndex(this.terrain, col, row)] === 0
	}

	#canEnter(col: number, row: number): boolean {
		return isWalkable(this.terrain, col, row) && this.#isFree(col, row)
	}

	/** Starts a step towards the nearest free tile from which `target` is in reach. */
	#stepToward(unit: Unit, target: Unit, carry: number): boolean {
		const { reach } = unit.stats
		const { radius } = target.stats
		const step = this.#search.firstStep(
			unit.col,
			unit.row,
			(c, r) => this.#canEnter(c, r),
			(c, r) => footprintDistance(c, r, 0, target.col, target.row, radius) <= reach
		)
		if (!step) return false
		this.#startStep(unit, step.col, step.row, step.facing, carry)
		return true
	}

	/**
	 * Starts a step down the lane's field: the free neighbour that's cheapest and closer to the end,
	 * else one that's no further (a sidestep round a blocker), never straight back.
	 */
	#stepAlongLane(unit: Unit, carry: number): boolean {
		const lane = unit.lane
		if (!lane) return false
		const here = lane.field.at(unit.col, unit.row)
		let best: (typeof DIRECTIONS)[number] | null = null
		let bestCost = here
		let sidestep: (typeof DIRECTIONS)[number] | null = null
		for (const dir of DIRECTIONS) {
			const c = unit.col + dir.dc
			const r = unit.row + dir.dr
			if (!this.#canEnter(c, r)) continue
			const cost = lane.field.at(c, r)
			if (cost === UNREACHABLE) continue
			if (cost < bestCost) {
				best = dir
				bestCost = cost
			} else if (cost === here && !sidestep && tileIndex(this.terrain, c, r) !== unit.previous) {
				sidestep = dir
			}
		}
		const dir = best ?? sidestep
		if (!dir) return false
		this.#startStep(unit, unit.col + dir.dc, unit.row + dir.dr, dir.facing, carry)
		return true
	}

	#startStep(unit: Unit, col: number, row: number, facing: Facing, progress: number) {
		this.#occupant[tileIndex(this.terrain, col, row)] = unit.id
		unit.previous = tileIndex(this.terrain, unit.col, unit.row)
		unit.facing = facing
		unit.step = { col, row, facing, progress }
	}

	#arrive(unit: Unit) {
		const step = unit.step
		if (!step) return
		this.#release(unit.col, unit.row, unit)
		unit.col = step.col
		unit.row = step.row
		unit.step = null
	}

	#release(col: number, row: number, unit: Unit) {
		const i = tileIndex(this.terrain, col, row)
		if (this.#occupant[i] === unit.id) this.#occupant[i] = 0
	}

	// Combat

	#charge(unit: Unit, percent: number) {
		const gain = percent === 100 ? unit.stats.speed : Math.floor((unit.stats.speed * percent) / 100)
		unit.gauge = Math.min(GAUGE_FULL, unit.gauge + gain)
	}

	#level(unit: Unit): number {
		const level = this.terrain.level[tileIndex(this.terrain, unit.col, unit.row)]
		return Number.isNaN(level) ? 0 : level
	}

	#attack(attacker: Unit, target: Unit) {
		attacker.gauge = 0
		attacker.lastAttack = this.tick
		const side = exposure(target.facing, attacker.col - target.col, attacker.row - target.row)
		const uphill = this.#level(target) > this.#level(attacker)
		const chance = hitChance(attacker.stats, target.stats, side, uphill)
		const hit = this.random.percent(chance)
		const damage = hit ? physicalDamage(attacker.stats, target.stats) : 0
		target.hp -= damage
		this.#events.push({ type: "attack", attacker, target, hit, damage, side })
		if (target.hp <= 0) this.#kill(target, attacker)
	}

	#kill(unit: Unit, killer: Unit | null) {
		unit.alive = false
		unit.hp = 0
		unit.target = null
		this.#release(unit.col, unit.row, unit)
		if (unit.step) this.#release(unit.step.col, unit.step.row, unit)
		if (unit.stats.structure) {
			this.#forFootprint(unit, (i) => {
				if (this.#occupant[i] === unit.id) this.#occupant[i] = 0
				this.#footprints[i] = 0
			})
			for (const lane of this.lanes) lane.field = this.#field(this.#paths.get(lane) ?? [])
		}
		this.#events.push({ type: "death", unit, killer })
	}
}
