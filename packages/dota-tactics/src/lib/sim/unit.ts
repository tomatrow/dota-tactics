import type { Team, UnitStats } from "#lib/content/units.ts"
import type { Facing } from "./grid.ts"
import type { LaneField } from "./lane-field.ts"

export type LaneName = "top" | "mid" | "bot"

/** A lane one team's creeps walk. */
export interface Lane {
	readonly team: Team
	readonly name: LaneName
	/** Where its waves appear. */
	readonly spawner: readonly [col: number, row: number]
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
}

/** Anything on the board that fights: creeps and structures, heroes later. */
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
	/** The tile the unit stands on, or is stepping off. For a structure, its footprint's centre. */
	col: number
	row: number
	facing: Facing
	hp: number
	/** Points × TICK_RATE; full at GAUGE_FULL. */
	gauge = 0
	step: Step | null = null
	target: Unit | null = null
	/** The tile index the unit last stepped off, so a sidestep doesn't go straight back. */
	previous = -1
	alive = true
	/** The tick of its last attack; -1 before the first. */
	lastAttack = -1

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
		this.hp = init.stats.hp
	}
}
