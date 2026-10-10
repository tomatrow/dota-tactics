/**
 * Jobs: a hero's stats and abilities (DESIGN.md §7, §13). A hero is a race and a job, fixed at the
 * draft; the prototype has one of each pairing it needs.
 */
import type { AbilityId } from "./abilities.ts"
import type { UnitStats } from "./units.ts"

export type JobId = "warrior" | "blackMage"

export interface Job {
	readonly id: JobId
	readonly race: string
	readonly name: string
	readonly stats: UnitStats
	/** In the order of their keys: Q, W, E. */
	readonly abilities: readonly AbilityId[]
}

/** Walk speed (game units per second) by Move (§5). */
export const MOVE_WALK = { 3: 225, 4: 300, 5: 385 } as const

/** What every hero has in common. */
const hero = {
	kind: "hero",
	// How far an attack-move looks for enemies, as a creep's aggro.
	aggro: 8,
	radius: 0,
	structure: false,
	vsStructures: 1,
	vsCreeps: 1,
	bounty: 0
} as const

export const JOBS: Record<JobId, Job> = {
	warrior: {
		id: "warrior",
		race: "Bangaa",
		name: "Warrior",
		stats: {
			...hero,
			hp: 900,
			mp: 40,
			// Shortsword included: 178 on a melee creep, about two creep hits.
			atk: 180,
			matk: 20,
			def: 30,
			res: 14,
			evasion: 10,
			speed: 20, // one action every 5 s
			reach: 2,
			walk: MOVE_WALK[4]
		},
		abilities: ["firstAid", "rendSpeed", "bodySlam"]
	},
	blackMage: {
		id: "blackMage",
		race: "Nu Mou",
		name: "Black Mage",
		stats: {
			...hero,
			hp: 600,
			mp: 120,
			// A rod: weak on purpose, so mages last-hit with spells.
			atk: 60,
			matk: 60,
			def: 16,
			res: 32,
			evasion: 5,
			speed: 18, // one action every 5.6 s
			reach: 2,
			walk: MOVE_WALK[3]
		},
		abilities: ["fire", "blizzard", "fira"]
	}
}

export const JOB_IDS = Object.keys(JOBS) as readonly JobId[]

export const isJobId = (id: string): id is JobId => (JOB_IDS as readonly string[]).includes(id)
