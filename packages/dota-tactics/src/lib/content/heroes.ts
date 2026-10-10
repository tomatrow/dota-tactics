/**
 * Jobs: a hero's stats and abilities (DESIGN.md §7, §13). A hero is a race and a job, fixed at the
 * draft; the prototype has one of each pairing it needs.
 */
import type { AbilityId } from "./abilities.ts"
import type { UnitStats } from "./units.ts"

export type JobId = "warrior"

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

export const JOBS: Record<JobId, Job> = {
	warrior: {
		id: "warrior",
		race: "Bangaa",
		name: "Warrior",
		stats: {
			kind: "hero",
			hp: 900,
			mp: 40,
			// Shortsword included: 178 on a melee creep, about two creep hits.
			atk: 180,
			def: 30,
			evasion: 10,
			speed: 20, // one action every 5 s
			reach: 2,
			walk: MOVE_WALK[4],
			// How far an attack-move looks for enemies, as a creep's aggro.
			aggro: 8,
			radius: 0,
			structure: false,
			vsStructures: 1,
			vsCreeps: 1,
			bounty: 0
		},
		abilities: ["firstAid", "rendSpeed", "bodySlam"]
	}
}
