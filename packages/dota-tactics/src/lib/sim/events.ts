import type { AbilityId } from "#lib/content/abilities.ts"
import type { Exposure } from "./grid.ts"
import type { Unit } from "./unit.ts"

/** What happened in a tick, in the order it happened: for the view, telemetry and tests. */
export type SimEvent =
	/** A unit appeared: a creep, a structure at the start, a hero at the start or respawning. */
	| { readonly type: "spawn"; readonly unit: Unit }
	| {
			readonly type: "attack"
			readonly attacker: Unit
			readonly target: Unit
			/** The ability it was, or null for a plain attack. */
			readonly ability: AbilityId | null
			readonly hit: boolean
			readonly damage: number
			readonly side: Exposure
	  }
	| {
			readonly type: "heal"
			readonly unit: Unit
			readonly ability: AbilityId
			readonly amount: number
	  }
	/** Damage a unit takes from its own ability. */
	| { readonly type: "recoil"; readonly unit: Unit; readonly damage: number }
	| {
			readonly type: "death"
			readonly unit: Unit
			readonly killer: Unit | null
			/** Gold the killer earned: a hero's last hit on an enemy creep. */
			readonly bounty: number
			/** A hero killed its own creep. */
			readonly denied: boolean
	  }
