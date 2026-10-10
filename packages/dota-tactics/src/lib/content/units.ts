/**
 * Unit stats, and lane creeps and Sentinels (DESIGN.md §6, §9). v0 numbers, to be tuned with
 * `scripts/lane-sim.ts`. Heroes' stats come from their jobs (`heroes.ts`).
 */

export type Team = "radiant" | "dire"
export type CreepKind = "melee" | "ranged" | "siege"
export type UnitKind = CreepKind | "sentinel" | "hero"

export interface UnitStats {
	readonly kind: UnitKind
	readonly hp: number
	/** Most MP; MP starts at 0 and grows 10 per action (§3). 0 for units without abilities. */
	readonly mp: number
	readonly atk: number
	/** Magic attack: a spell does its power × MATK/50 (§12). */
	readonly matk: number
	readonly def: number
	/** Magic defence: a spell does RES/2 less. */
	readonly res: number
	/** Percent, before facing (DESIGN.md §12). */
	readonly evasion: number
	/** Gauge points per second: 100 / speed seconds per action. */
	readonly speed: number
	/** Attack reach in tiles (Manhattan). */
	readonly reach: number
	/** Walk speed in game units per second; 0 never moves. */
	readonly walk: number
	/** How far away (tiles) the unit notices enemies. */
	readonly aggro: number
	/** Footprint: tiles out from the centre tile (0 = one tile, 1 = 3×3). */
	readonly radius: number
	readonly structure: boolean
	/** Damage multiplier against structures. */
	readonly vsStructures: number
	/** Damage multiplier against lane creeps. */
	readonly vsCreeps: number
	/** Gold to the hero who lands the killing blow (§6). */
	readonly bounty: number
}

export const isCreep = (stats: UnitStats): boolean =>
	stats.kind === "melee" || stats.kind === "ranged" || stats.kind === "siege"

export const isHero = (stats: UnitStats): boolean => stats.kind === "hero"

const creep = {
	mp: 0,
	matk: 0,
	def: 0,
	res: 0,
	evasion: 0,
	speed: 33, // ~3 s per attack (§6)
	walk: 325, // Dota's creep speed
	aggro: 8, // 500 u
	radius: 0,
	structure: false,
	vsStructures: 1,
	vsCreeps: 1
} as const

export const CREEPS: Record<CreepKind, UnitStats> = {
	// Dota's HP. ATK sized so equal waves resolve in ~30 s at a 3 s cadence (§6).
	// Bounties are Dota's.
	melee: { ...creep, kind: "melee", hp: 550, atk: 80, def: 4, reach: 2, bounty: 36 },
	ranged: { ...creep, kind: "ranged", hp: 300, atk: 70, reach: 8, bounty: 45 },
	// Slow and long-ranged; hits structures hard.
	siege: {
		...creep,
		kind: "siege",
		hp: 900,
		atk: 100,
		speed: 15,
		reach: 10,
		vsStructures: 2.5,
		bounty: 70
	}
}

/** FFTA monster families (§6). */
export const CREEP_NAMES: Record<Team, Record<CreepKind, string>> = {
	radiant: { melee: "Goblin", ranged: "Sprite", siege: "Antlion" },
	dire: { melee: "Zombie", ranged: "Red Cap", siege: "Flan" }
}

/** Sentinel (tower) stats by tier (§9). ATK is what heroes take, before DEF. */
export const SENTINELS: Record<1 | 2 | 3 | 4, UnitStats> = {
	1: sentinel(1800, 300),
	2: sentinel(2100, 340),
	3: sentinel(2100, 400),
	4: sentinel(2100, 400)
}

function sentinel(hp: number, atk: number): UnitStats {
	return {
		kind: "sentinel",
		hp,
		mp: 0,
		atk,
		matk: 0,
		// High: a melee creep (80) chips 15 a hit.
		def: 130,
		// Spells don't hurt structures (Dota), so RES never comes into it.
		res: 0,
		evasion: 0,
		speed: 25, // one hit every 4 s
		reach: 11, // 700 u
		walk: 0,
		aggro: 11,
		radius: 1,
		structure: true,
		vsStructures: 1,
		// A T1 does 450 before DEF to creeps: 2 hits a melee or siege creep, 1 a ranged. Creeps
		// alone rarely take a T1 in a 30-minute game (scripts/lane-sim.ts).
		vsCreeps: 1.5,
		bounty: 0
	}
}
