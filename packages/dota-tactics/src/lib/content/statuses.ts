/**
 * Status effects (DESIGN.md §12): FFTA's set, as abilities need them. Each lasts a while and
 * changes a unit's numbers; inflicting it again restarts its time. Structures are immune.
 */

export type StatusId = "slow" | "chill"

export interface Status {
	readonly id: StatusId
	readonly name: string
	/** Added to the unit's speed (gauge points per second) while it lasts. */
	readonly speed: number
	/** Percent of its walk speed the unit keeps while it lasts. */
	readonly walk: number
}

export const STATUSES: Record<StatusId, Status> = {
	// Rend Speed's: a speed-20 gauge fills 30% slower.
	slow: { id: "slow", name: "Slow", speed: -6, walk: 100 },
	// Blizzard's, a Dota-ism: 40% slower on foot, so a Move 3 mage can get away from Move 4.
	chill: { id: "chill", name: "Chill", speed: 0, walk: 60 }
}

export const STATUS_IDS = Object.keys(STATUSES) as readonly StatusId[]

/** A status an ability inflicts, and for how long. */
export interface Infliction {
	readonly status: StatusId
	readonly seconds: number
}
