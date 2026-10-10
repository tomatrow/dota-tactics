import { ABILITIES, type Ability } from "#lib/content/abilities.ts"
import { JOBS, type JobId } from "#lib/content/heroes.ts"
import { TUNING } from "#lib/content/tuning.ts"
import {
	CREEP_NAMES,
	CREEPS,
	isCreep,
	isHero,
	SENTINELS,
	type CreepKind,
	type Team
} from "#lib/content/units.ts"
import { hitChance, physicalDamage } from "./combat.ts"
import type { Command } from "./commands.ts"
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
import { PathSearch, stepsLeft, type PathGoal } from "./path-search.ts"
import { Random } from "./random.ts"
import { LocalSearch } from "./search.ts"
import { Hero, IDLE, Unit, type Lane, type LaneName, type Order, type UnitInit } from "./unit.ts"

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

/** A hero to place, at its team's Clan Hall. */
export interface HeroSetup {
	readonly team: Team
	readonly job: JobId
}

/** Everything a world starts from. */
export interface Scenario {
	readonly terrain: Terrain
	readonly lanes: readonly LaneSetup[]
	readonly structures: readonly StructureSetup[]
	readonly heroes?: readonly HeroSetup[]
	/** Each team's Clan Hall tile, where its heroes start and respawn; needed for its heroes. */
	readonly halls?: Partial<Record<Team, readonly [col: number, row: number]>>
	/** Whether waves spawn (default true); tests turn them off and place creeps themselves. */
	readonly waves?: boolean
}

/** How far (tiles) a unit looks for a way to reach its target, or a hero for a tile to stop on. */
const SEARCH_LIMIT = 16

/** The most tiles a hero's path search expands before settling for the nearest it found. */
const PATH_LIMIT = 12_000

/** Ticks a hero that found no way to go waits before searching again. */
const RETRY_TICKS = 5

/** How far (tiles) from a clicked tile a hero looks for one it can reach, or stop on. */
const NEAREST_LIMIT = 24

const WAVE: readonly CreepKind[] = ["melee", "melee", "melee", "ranged"]

/**
 * The first tile, in a fixed order, exactly `k` steps (Manhattan) from (col, row) where `test`
 * holds; null when there's none.
 */
function findInRing(
	col: number,
	row: number,
	k: number,
	test: (col: number, row: number) => boolean
): [number, number] | null {
	if (k === 0) return test(col, row) ? [col, row] : null
	for (let i = 0; i < k; i++) {
		const ring: [number, number][] = [
			[col + i, row + k - i],
			[col + k - i, row - i],
			[col - i, row - k + i],
			[col - k + i, row + i]
		]
		for (const [c, r] of ring) if (test(c, r)) return [c, r]
	}
	return null
}

/**
 * The simulation: a fixed-rate, deterministic world of units on the map's tiles. `step()` advances
 * one tick. Units act in id order; all randomness comes from the world's seeded generator; players
 * steer their heroes with `command()`.
 */
export class World {
	readonly terrain: Terrain
	readonly random: Random
	readonly lanes: readonly Lane[]
	/** Every hero, living or dead, in id order. */
	readonly heroes: readonly Unit[]
	/** The tick `step()` runs next; the time is `tick / TICK_RATE` seconds. */
	tick = 0
	/** The living units, in id order. */
	units: Unit[] = []

	readonly #paths: ReadonlyMap<Lane, readonly TilePoint[]>
	/** Per tile: the id of the unit standing on (or stepping onto) it; 0 when free. */
	readonly #occupant: Int32Array
	/** Per tile: the id of a hero passing through an ally standing there (§6); 0 when none. */
	readonly #passer: Int32Array
	/** Per tile: 1 inside a living structure's footprint. */
	readonly #footprints: Uint8Array
	/** Per tile: which connected area of open ground it's in; 0 where nobody can stand. */
	#regions: Int32Array
	readonly #byId = new Map<number, Unit>()
	readonly #search = new LocalSearch(SEARCH_LIMIT)
	readonly #path: PathSearch
	readonly #waves: boolean
	#commands: { unit: number; command: Command }[] = []
	#nextId = 1
	#events: SimEvent[] = []

	constructor(scenario: Scenario, seed: number) {
		const { terrain } = scenario
		this.terrain = terrain
		this.random = new Random(seed)
		this.#waves = scenario.waves ?? true
		const count = terrain.cols * terrain.rows
		this.#occupant = new Int32Array(count)
		this.#passer = new Int32Array(count)
		this.#footprints = new Uint8Array(count)
		this.#path = new PathSearch(terrain.cols, terrain.rows)

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
		this.#regions = this.#findRegions()

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

		this.heroes = (scenario.heroes ?? []).map(({ team, job }) => {
			const hall = scenario.halls?.[team]
			if (!hall) throw new Error(`a ${team} hero needs a Clan Hall`)
			const [[col, row]] = this.#freeTilesNear(hall[0], hall[1], 1)
			const unit = this.#add({
				team,
				stats: JOBS[job].stats,
				name: `${JOBS[job].race} ${JOBS[job].name}`,
				col,
				row,
				facing: team === "radiant" ? Facing.north : Facing.south,
				hero: new Hero(JOBS[job], hall)
			})
			this.#occupant[tileIndex(terrain, col, row)] = unit.id
			return unit
		})
	}

	/** Seconds since the game started. */
	get time(): number {
		return this.tick / TICK_RATE
	}

	/** The unit standing on (or stepping onto) a tile. */
	unitAt(col: number, row: number): Unit | undefined {
		if (!inside(this.terrain, col, row)) return undefined
		const id = this.#occupant[tileIndex(this.terrain, col, row)]
		return id === 0 ? undefined : this.#byId.get(id)
	}

	/** A unit by id, living or a dead hero; undefined once anything else has died. */
	unit(id: number): Unit | undefined {
		return this.#byId.get(id)
	}

	/**
	 * Commands a hero. Commands take effect at the start of the next `step()`, in the order they
	 * were given; one that doesn't apply (a dead target, too little MP) is ignored.
	 */
	command(hero: number, command: Command) {
		this.#commands.push({ unit: hero, command })
	}

	/** Advances one tick; returns what happened in it (and since the last step). */
	step(): SimEvent[] {
		this.#applyCommands()
		this.#respawnHeroes()
		if (this.#waves && this.tick % ticks(TUNING.waveInterval) === 0) {
			this.#spawnWaves(Math.floor(this.tick / ticks(TUNING.waveInterval)))
		}
		for (const unit of this.units) {
			if (!unit.alive) continue
			if (unit.stats.structure) this.#structureTurn(unit)
			else this.#walkerTurn(unit)
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

	/** Whether a hero may deny this unit: its own creep, under the deny threshold (§6). */
	deniable(hero: Unit, unit: Unit): boolean {
		return (
			unit.team === hero.team &&
			isCreep(unit.stats) &&
			unit.hp * 100 < unit.stats.hp * TUNING.denyBelow
		)
	}

	// Setup

	#add(init: UnitInit): Unit {
		const unit = new Unit(this.#nextId++, init)
		this.units.push(unit)
		this.#byId.set(unit.id, unit)
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

	/** Labels each connected area of walkable ground outside structures' footprints. */
	#findRegions(): Int32Array {
		const { cols, rows, walkable } = this.terrain
		const regions = new Int32Array(cols * rows)
		const queue = new Int32Array(cols * rows)
		let label = 0
		for (let startTile = 0; startTile < regions.length; startTile++) {
			if (regions[startTile] !== 0) continue
			if (walkable[startTile] !== 1 || this.#footprints[startTile] === 1) continue
			label++
			regions[startTile] = label
			let head = 0
			let tail = 0
			queue[tail++] = startTile
			while (head < tail) {
				const at = queue[head++]
				const col = at % cols
				const row = (at - col) / cols
				for (const { dc, dr } of DIRECTIONS) {
					const c = col + dc
					const r = row + dr
					if (c < 0 || r < 0 || c >= cols || r >= rows) continue
					const n = r * cols + c
					if (regions[n] !== 0 || walkable[n] !== 1 || this.#footprints[n] === 1) continue
					regions[n] = label
					queue[tail++] = n
				}
			}
		}
		return regions
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
			if (this.#canEnter(c, r)) found.push([c, r])
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
		if (found.length < count) throw new Error(`no room near ${String([col, row])}`)
		return found
	}

	// Commands

	#applyCommands() {
		const commands = this.#commands
		this.#commands = []
		for (const { unit: id, command } of commands) {
			const unit = this.#byId.get(id)
			const hero = unit?.hero
			if (!unit?.alive || !hero) continue
			const order = this.#orderFor(unit, hero, command)
			if (!order) continue
			hero.order = order
			hero.retryAt = 0
		}
	}

	/** The order a command gives, or null when it doesn't apply. */
	#orderFor(unit: Unit, hero: Hero, command: Command): Order | null {
		switch (command.type) {
			case "stop":
				return IDLE
			case "move":
			case "attackMove": {
				const tile = this.#reachableNear(unit, command.col, command.row)
				return tile && { type: command.type, col: tile[0], row: tile[1] }
			}
			case "attack": {
				const target = this.#byId.get(command.target)
				if (!target?.alive || target === unit) return null
				if (target.team !== unit.team || this.deniable(unit, target)) {
					return { type: "attack", target }
				}
				const tile = this.#reachableNear(unit, target.col, target.row)
				return tile && { type: "move", col: tile[0], row: tile[1] }
			}
			case "ability": {
				const ability = ABILITIES[command.ability]
				if (!hero.job.abilities.includes(ability.id) || !ability.enabled) return null
				if (unit.mp < ability.mp) return null
				if (ability.target === "self") {
					const then = hero.order.type === "ability" ? hero.order.then : hero.order
					return { type: "ability", ability, target: null, then }
				}
				const target = command.target === null ? undefined : this.#byId.get(command.target)
				if (!target?.alive || target.team === unit.team) return null
				return { type: "ability", ability, target, then: { type: "attack", target } }
			}
		}
	}

	/**
	 * The tile nearest (col, row) in the same open area as the unit, so a click on a cliff or across
	 * one walks as close as it can; null when there's none near.
	 */
	#reachableNear(unit: Unit, col: number, row: number): [number, number] | null {
		const region = this.#regions[tileIndex(this.terrain, unit.col, unit.row)]
		const reachable = (c: number, r: number) =>
			inside(this.terrain, c, r) && this.#regions[tileIndex(this.terrain, c, r)] === region
		for (let k = 0; k <= NEAREST_LIMIT; k++) {
			const tile = findInRing(col, row, k, reachable)
			if (tile) return tile
		}
		return null
	}

	// Heroes

	#respawnHeroes() {
		for (const unit of this.heroes) {
			const hero = unit.hero
			if (unit.alive || !hero || this.tick < hero.respawnAt) continue
			const [[col, row]] = this.#freeTilesNear(hero.hall[0], hero.hall[1], 1)
			unit.col = col
			unit.row = row
			unit.alive = true
			unit.hp = unit.stats.hp
			unit.mp = 0
			unit.gauge = 0
			unit.step = null
			unit.target = null
			unit.previous = -1
			unit.facing = unit.team === "radiant" ? Facing.north : Facing.south
			hero.order = IDLE
			hero.respawnAt = -1
			hero.retryAt = 0
			this.#occupant[tileIndex(this.terrain, col, row)] = unit.id
			const at = this.units.findIndex((u) => u.id > unit.id)
			this.units.splice(at < 0 ? this.units.length : at, 0, unit)
			this.#events.push({ type: "spawn", unit })
		}
	}

	/** A standing hero carries out its order: walk, fight, use an ability, or wait and charge. */
	#heroDecide(unit: Unit, hero: Hero, carry: number) {
		this.#settle(unit)
		const order = hero.order
		switch (order.type) {
			case "idle":
				unit.target = null
				this.#hold(unit, carry)
				return
			case "move": {
				unit.target = null
				const slack = this.#stopSlack(unit, order.col, order.row)
				const goal = { col: order.col, row: order.row, radius: 0, slack }
				if (this.#pursue(unit, hero, goal, carry) === "there") {
					hero.order = IDLE
					this.#charge(unit, 100)
				}
				return
			}
			case "attack":
				if (!order.target.alive) {
					hero.order = IDLE
					this.#heroDecide(unit, hero, carry)
					return
				}
				if (this.#ready(unit, hero, order.target, unit.stats.reach, carry)) {
					this.#attack(unit, order.target)
				}
				return
			case "attackMove": {
				const target = this.#heroTarget(unit)
				if (target) {
					if (this.#ready(unit, hero, target, unit.stats.reach, carry)) this.#attack(unit, target)
					return
				}
				unit.target = null
				const slack = this.#stopSlack(unit, order.col, order.row)
				const goal = { col: order.col, row: order.row, radius: 0, slack }
				if (this.#pursue(unit, hero, goal, carry) === "there") {
					hero.order = IDLE
					this.#charge(unit, 100)
				}
				return
			}
			case "ability": {
				const { ability, target } = order
				if (!target) {
					unit.target = null
					if (!this.#hold(unit, carry) || unit.gauge < GAUGE_FULL) return
					this.#cast(unit, ability, unit)
					hero.order = order.then
					return
				}
				if (!target.alive) {
					hero.order = IDLE
					this.#heroDecide(unit, hero, carry)
					return
				}
				if (!this.#ready(unit, hero, target, ability.reach, carry)) return
				if (unit.mp >= ability.mp) this.#cast(unit, ability, target)
				hero.order = order.then
				return
			}
		}
	}

	/**
	 * Stands and charges where the hero is, or steps off an ally it's passing through (it may not
	 * stop there). True when it's standing on its own tile.
	 */
	#hold(unit: Unit, carry: number): boolean {
		if (this.#canStand(unit, unit.col, unit.row)) {
			this.#charge(unit, 100)
			return true
		}
		const step = this.#search.firstStep(
			unit.col,
			unit.row,
			(c, r) => this.#canPass(unit, c, r),
			(c, r) => this.#canStand(unit, c, r)
		)
		if (step) this.#startStep(unit, step.col, step.row, step.facing, carry)
		else this.#charge(unit, 100)
		return false
	}

	/**
	 * Walks into reach of a target and faces it, charging once there. True when it's in reach with a
	 * full gauge: time to act.
	 */
	#ready(unit: Unit, hero: Hero, target: Unit, reach: number, carry: number): boolean {
		unit.target = target
		const goal = { col: target.col, row: target.row, radius: target.stats.radius, slack: reach }
		if (this.#pursue(unit, hero, goal, carry) !== "there") return false
		unit.facing = facingToward(target.col - unit.col, target.row - unit.row, unit.facing)
		this.#charge(unit, 100)
		return unit.gauge >= GAUGE_FULL
	}

	/**
	 * Heads for a goal: "there" when the hero stands on a tile in it (the caller charges),
	 * "walking" when it set off, "waiting" when it can't get closer for now (it charges meanwhile).
	 */
	#pursue(unit: Unit, hero: Hero, goal: PathGoal, carry: number): "there" | "walking" | "waiting" {
		const here = stepsLeft(goal, unit.col, unit.row) === 0
		if (here && this.#canStand(unit, unit.col, unit.row)) return "there"
		if (this.tick >= hero.retryAt) {
			const step = this.#path.firstStep(
				unit.col,
				unit.row,
				goal,
				(c, r) => this.#canPass(unit, c, r),
				(c, r) => this.#canStand(unit, c, r),
				PATH_LIMIT
			)
			if (step) {
				this.#startStep(unit, step.col, step.row, step.facing, carry)
				return "walking"
			}
			hero.retryAt = this.tick + RETRY_TICKS
		}
		this.#charge(unit, 100)
		return "waiting"
	}

	/**
	 * How far from a tile a hero walking to it may stop: 0 when it can stand there, else the
	 * distance to the nearest tile it can (an ally or enemy is on it).
	 */
	#stopSlack(unit: Unit, col: number, row: number): number {
		const region = this.#regions[tileIndex(this.terrain, unit.col, unit.row)]
		const standable = (c: number, r: number) =>
			inside(this.terrain, c, r) &&
			this.#regions[tileIndex(this.terrain, c, r)] === region &&
			this.#canStand(unit, c, r)
		for (let k = 0; k <= NEAREST_LIMIT; k++) if (findInRing(col, row, k, standable)) return k
		return NEAREST_LIMIT
	}

	/**
	 * An attack-moving hero's target: the one it has while that's in aggro range, else the nearest
	 * enemy unit in range, else the nearest structure.
	 */
	#heroTarget(unit: Unit): Unit | null {
		const { aggro } = unit.stats
		const current = unit.target
		if (current?.alive && current.team !== unit.team && this.#distance(unit, current) <= aggro) {
			return current
		}
		return (
			this.#nearestEnemy(unit, aggro, (u) => !u.stats.structure) ??
			this.#nearestEnemy(unit, aggro, (u) => u.stats.structure)
		)
	}

	/** A hero passing through an ally claims the tile once the ally has left it. */
	#settle(unit: Unit) {
		const i = tileIndex(this.terrain, unit.col, unit.row)
		if (this.#passer[i] === unit.id && this.#occupant[i] === 0) {
			this.#occupant[i] = unit.id
			this.#passer[i] = 0
		}
	}

	// Turns

	#structureTurn(unit: Unit) {
		this.#charge(unit, 100)
		const current = unit.target
		unit.target =
			current?.alive && this.#distance(unit, current) <= unit.stats.reach ?
				current
			:	this.#nearestEnemy(unit, unit.stats.reach, (u) => !u.stats.structure)
		if (unit.target && unit.gauge >= GAUGE_FULL) this.#attack(unit, unit.target)
	}

	/** A creep's or hero's tick: a step under way goes on; a standing unit decides what to do. */
	#walkerTurn(unit: Unit) {
		const step = unit.step
		let carry = 0
		if (step) {
			step.progress += unit.stats.walk
			this.#charge(unit, TUNING.walkCharge)
			if (step.progress < STEP_FULL) return
			carry = step.progress - STEP_FULL
			this.#arrive(unit)
		}
		if (unit.hero) this.#heroDecide(unit, unit.hero, carry)
		else this.#creepDecide(unit, carry)
	}

	/**
	 * A standing creep's choice: fight, close in, walk the lane (round whatever stands in it), or
	 * wait (and charge).
	 */
	#creepDecide(unit: Unit, carry: number) {
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
		} else if (this.#stepAlongLane(unit, carry) || this.#detour(unit, carry)) {
			return
		}
		this.#charge(unit, 100)
	}

	/**
	 * A creep's target (DESIGN.md §6): enemy creeps first, then heroes, then structures, all within
	 * aggro range. It keeps the one it has while that's in range, unless something it prefers comes
	 * into range.
	 */
	#creepTarget(unit: Unit): Unit | null {
		const { aggro } = unit.stats
		const current = unit.target
		const kept = current?.alive && this.#distance(unit, current) <= aggro ? current : null
		if (kept && isCreep(kept.stats)) return kept
		const creep = this.#nearestEnemy(unit, aggro, (u) => isCreep(u.stats))
		if (creep) return creep
		if (kept && isHero(kept.stats)) return kept
		const hero = this.#nearestEnemy(unit, aggro, (u) => isHero(u.stats))
		if (hero) return hero
		return kept ?? this.#nearestEnemy(unit, aggro, (u) => u.stats.structure)
	}

	/** The nearest living enemy within `range` that `filter` accepts (ties to the lowest id). */
	#nearestEnemy(unit: Unit, range: number, filter: (other: Unit) => boolean): Unit | null {
		let best: Unit | null = null
		let bestDistance = Infinity
		for (const other of this.units) {
			if (!other.alive || other.team === unit.team || !filter(other)) continue
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

	/** Nobody stands on, steps onto or passes through the tile. */
	#isFree(col: number, row: number): boolean {
		const i = tileIndex(this.terrain, col, row)
		return this.#occupant[i] === 0 && this.#passer[i] === 0
	}

	/** Whether a creep (or a unit being placed) may enter a tile: walkable and free. */
	#canEnter(col: number, row: number): boolean {
		return isWalkable(this.terrain, col, row) && this.#isFree(col, row)
	}

	/**
	 * Whether a hero may step onto a tile (§6): walkable, outside structures, and free or held by
	 * an ally it can walk through (one hero passing at a time).
	 */
	#canPass(unit: Unit, col: number, row: number): boolean {
		if (!isWalkable(this.terrain, col, row)) return false
		const i = tileIndex(this.terrain, col, row)
		if (this.#footprints[i] === 1) return false
		const passer = this.#passer[i]
		if (passer !== 0 && passer !== unit.id) return false
		const occupant = this.#occupant[i]
		return occupant === 0 || occupant === unit.id || this.#byId.get(occupant)?.team === unit.team
	}

	/** Whether a unit may stop on a tile: walkable, and nobody else on it. */
	#canStand(unit: Unit, col: number, row: number): boolean {
		if (!isWalkable(this.terrain, col, row)) return false
		const i = tileIndex(this.terrain, col, row)
		const occupant = this.#occupant[i]
		const passer = this.#passer[i]
		return (occupant === 0 || occupant === unit.id) && (passer === 0 || passer === unit.id)
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

	/**
	 * Starts a step round something standing in the lane (a hero body-blocking, a creep that
	 * stopped): towards the nearest free tile further down the lane.
	 */
	#detour(unit: Unit, carry: number): boolean {
		const field = unit.lane?.field
		if (!field) return false
		const here = field.at(unit.col, unit.row)
		const step = this.#search.firstStep(
			unit.col,
			unit.row,
			(c, r) => this.#canEnter(c, r),
			(c, r) => field.at(c, r) < here
		)
		if (!step) return false
		this.#startStep(unit, step.col, step.row, step.facing, carry)
		return true
	}

	/** Claims the tile a unit steps onto: as its occupant, or as a hero passing an ally there. */
	#startStep(unit: Unit, col: number, row: number, facing: Facing, progress: number) {
		const i = tileIndex(this.terrain, col, row)
		if (this.#occupant[i] === 0) this.#occupant[i] = unit.id
		else this.#passer[i] = unit.id
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

	/** Lets go of whatever a unit holds on a tile. */
	#release(col: number, row: number, unit: Unit) {
		const i = tileIndex(this.terrain, col, row)
		if (this.#occupant[i] === unit.id) this.#occupant[i] = 0
		if (this.#passer[i] === unit.id) this.#passer[i] = 0
	}

	// Combat

	#charge(unit: Unit, percent: number) {
		const gain = percent === 100 ? unit.stats.speed : Math.floor((unit.stats.speed * percent) / 100)
		unit.gauge = Math.min(GAUGE_FULL, unit.gauge + gain)
	}

	/** An action's cost: the full gauge, and its MP; every action gives MP (§3). */
	#act(unit: Unit, mp: number) {
		unit.gauge = 0
		unit.mp = Math.max(0, Math.min(unit.stats.mp, unit.mp - mp + TUNING.mpPerAction))
	}

	#level(unit: Unit): number {
		const level = this.terrain.level[tileIndex(this.terrain, unit.col, unit.row)]
		return Number.isNaN(level) ? 0 : level
	}

	#attack(attacker: Unit, target: Unit) {
		this.#act(attacker, 0)
		this.#strike(attacker, target, null, 1)
	}

	/** A physical blow: rolls to hit, deals damage; returns the damage dealt. */
	#strike(attacker: Unit, target: Unit, ability: Ability | null, power: number): number {
		attacker.lastAttack = this.tick
		const side = exposure(target.facing, attacker.col - target.col, attacker.row - target.row)
		const uphill = this.#level(target) > this.#level(attacker)
		const chance = hitChance(attacker.stats, target.stats, side, uphill)
		const hit = this.random.percent(chance)
		const damage = hit ? physicalDamage(attacker.stats, target.stats, power) : 0
		target.hp -= damage
		this.#events.push({
			type: "attack",
			attacker,
			target,
			ability: ability?.id ?? null,
			hit,
			damage,
			side
		})
		if (target.hp <= 0) this.#kill(target, attacker)
		return damage
	}

	#cast(unit: Unit, ability: Ability, target: Unit) {
		this.#act(unit, ability.mp)
		const { effect } = ability
		switch (effect.kind) {
			case "heal": {
				const amount = Math.min(
					unit.stats.hp - unit.hp,
					Math.floor((unit.stats.hp * effect.percent) / 100)
				)
				unit.hp += amount
				this.#events.push({ type: "heal", unit, ability: ability.id, amount })
				return
			}
			case "strike": {
				const dealt = this.#strike(unit, target, ability, effect.power)
				const recoil = Math.floor((dealt * effect.recoil) / 100)
				if (recoil === 0 || !unit.alive) return
				unit.hp -= recoil
				this.#events.push({ type: "recoil", unit, damage: recoil })
				if (unit.hp <= 0) this.#kill(unit, unit)
				return
			}
			case "slow":
				return
		}
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
			this.#regions = this.#findRegions()
		}
		// Nobody keeps aiming at it: a hero comes back as the same unit.
		for (const other of this.units) if (other.target === unit) other.target = null

		let bounty = 0
		let denied = false
		const credit = killer?.hero
		if (credit && killer !== unit && isCreep(unit.stats)) {
			if (killer.team === unit.team) {
				denied = true
				credit.denies++
			} else {
				bounty = unit.stats.bounty
				credit.gold += bounty
				credit.lastHits++
			}
		}

		const hero = unit.hero
		if (hero) {
			unit.step = null
			unit.gauge = 0
			unit.mp = 0
			hero.order = IDLE
			hero.respawnAt = this.tick + ticks(TUNING.respawnBase + TUNING.respawnPerLevel * hero.level)
		} else {
			this.#byId.delete(unit.id)
		}
		this.#events.push({ type: "death", unit, killer, bounty, denied })
	}
}
