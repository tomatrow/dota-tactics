import type { Ability } from "#lib/content/abilities.ts"
import type { Job } from "#lib/content/heroes.ts"
import type { StatusId } from "#lib/content/statuses.ts"
import type { Team, UnitStats } from "#lib/content/units.ts"
import type { Facing } from "./grid.ts"
import type { LaneField, TilePoint } from "./lane-field.ts"

export type LaneName = "top" | "mid" | "bot"

/** A lane one team's creeps walk. */
export interface Lane {
	readonly team: Team
	readonly name: LaneName
	/** Where its waves appear. */
	readonly spawner: readonly [col: number, row: number]
	/** In tile coordinates, from the spawner's end to the enemy's. */
	readonly path: readonly TilePoint[]
	/** The way to the end of its path; rebuilt when a structure falls. */
	field: LaneField
}

/** A step under way: the tile being entered, and how far into the step the unit is. */
export interface Step {
	readonly col: number
	readonly row: number
	readonly facing: Facing
	/** Game units × TICK_RATE; the step completes at STEP_FULL. */
	progress: number
}

/** What an ability is aimed at. */
export type Aim =
	| { readonly kind: "self" }
	/** Followed until the ability is used. */
	| { readonly kind: "unit"; readonly unit: Unit }
	| { readonly kind: "tile"; readonly col: number; readonly row: number }

/** A charged ability on its way (DESIGN.md §3): the caster stands until it lands. */
export interface Casting {
	readonly ability: Ability
	/** The tile it lands on, fixed when the cast started. */
	readonly col: number
	readonly row: number
	/** The tick the cast started, and the tick it lands. */
	readonly from: number
	readonly lands: number
}

/** What a hero is doing, as its player last ordered it (DESIGN.md §3, §11). */
export type Order =
	| { readonly type: "idle" }
	| { readonly type: "move"; readonly col: number; readonly row: number }
	/** Repeats until the target dies or the order changes. */
	| { readonly type: "attack"; readonly target: Unit }
	/** Walks to the tile, fighting whatever enemy comes within aggro range on the way. */
	| { readonly type: "attackMove"; readonly col: number; readonly row: number }
	/** Waits for a full gauge (walking into reach first), uses the ability, then does `then`. */
	| {
			readonly type: "ability"
			readonly ability: Ability
			readonly aim: Aim
			readonly then: Order
	  }

export const IDLE: Order = { type: "idle" }

/** What only a hero has: its job, orders, economy and respawn. */
export class Hero {
	readonly job: Job
	/** Its Clan Hall's tile: it starts and respawns on the nearest free tile to it. */
	readonly hall: readonly [col: number, row: number]
	order: Order = IDLE
	level = 1
	gold = 0
	lastHits = 0
	denies = 0
	kills = 0
	deaths = 0
	/** The tick it comes back after dying; -1 while alive. */
	respawnAt = -1
	/** A hero that found no way to go doesn't search again before this tick. */
	retryAt = 0

	constructor(job: Job, hall: readonly [col: number, row: number]) {
		this.job = job
		this.hall = hall
	}
}

export interface UnitInit {
	readonly team: Team
	readonly stats: UnitStats
	readonly name: string
	readonly col: number
	readonly row: number
	readonly facing: Facing
	readonly lane?: Lane
	readonly wave?: number
	readonly entity?: string
	readonly hero?: Hero
}

/** Anything on the board that fights: creeps, structures and heroes. */
export class Unit {
	readonly id: number
	readonly team: Team
	readonly stats: UnitStats
	readonly name: string
	/** The lane a creep walks; null for anything else. */
	readonly lane: Lane | null
	/** The wave a creep came in (0-based); -1 for anything else. */
	readonly wave: number
	/** The map entity a structure stands for, by name; null for anything else. */
	readonly entity: string | null
	/** A hero's own state; null for anything else. */
	readonly hero: Hero | null
	/** The tile the unit stands on, or is stepping off. For a structure, its footprint's centre. */
	col: number
	row: number
	facing: Facing
	hp: number
	mp = 0
	/** Points × TICK_RATE; full at GAUGE_FULL. */
	gauge = 0
	/** The tick its gauge last became full: how long it waited to act (§11, milestone 6). */
	fullSince = 0
	step: Step | null = null
	/** Who it's fighting, or walking into reach of. */
	target: Unit | null = null
	/** The tile index the unit last stepped off, so a sidestep doesn't go straight back. */
	previous = -1
	alive = true
	/** The tick of its last attack or spell; -1 before the first. */
	lastAttack = -1
	/** A charged ability it's casting; null when none. */
	casting: Casting | null = null
	/** The tick each status wears off: it has the status while the tick is earlier. */
	statuses: Record<StatusId, number> = { slow: 0, chill: 0 }
	/**
	 * For a creep: an enemy hero that attacked one of its heroes, which it goes for until tick
	 * `provokedUntil` (§6).
	 */
	provoker: Unit | null = null
	provokedUntil = 0

	constructor(id: number, init: UnitInit) {
		this.id = id
		this.team = init.team
		this.stats = init.stats
		this.name = init.name
		this.col = init.col
		this.row = init.row
		this.facing = init.facing
		this.lane = init.lane ?? null
		this.wave = init.wave ?? -1
		this.entity = init.entity ?? null
		this.hero = init.hero ?? null
		this.hp = init.stats.hp
	}
}
