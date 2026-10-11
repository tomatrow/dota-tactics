import type { AbilityId } from "#lib/content/abilities.ts"
import type { StatusId } from "#lib/content/statuses.ts"
import type { Team } from "#lib/content/units.ts"
import type { Exposure } from "./grid.ts"
import type { Unit } from "./unit.ts"

/** What happened in a tick, in the order it happened: for the view, telemetry and tests. */
export type SimEvent =
	/** A unit appeared: a creep, a structure at the start, a hero at the start or respawning. */
	| { readonly type: "spawn"; readonly unit: Unit }
	/** A weapon blow: a plain attack, or a technique (`ability`). */
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
	/** A charged ability started: it lands on its tile on tick `lands`. */
	| {
			readonly type: "charge"
			readonly unit: Unit
			readonly ability: AbilityId
			readonly col: number
			readonly row: number
			readonly lands: number
	  }
	/** A spell landed, centred on a tile; a `magic` event follows for each unit it hurt. */
	| {
			readonly type: "spell"
			readonly unit: Unit
			readonly ability: AbilityId
			readonly col: number
			readonly row: number
	  }
	/** Magic damage a spell did to one unit. */
	| {
			readonly type: "magic"
			readonly attacker: Unit
			readonly target: Unit
			readonly ability: AbilityId
			readonly damage: number
	  }
	/** A status took hold (or started again): it lasts until tick `until`. */
	| {
			readonly type: "status"
			readonly unit: Unit
			readonly status: StatusId
			readonly until: number
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
			/** Gold the killer earned: a hero's last hit on an enemy creep or hero. */
			readonly bounty: number
			/** A hero killed its own creep. */
			readonly denied: boolean
	  }
	/** A team destroyed the other's objective (the slice's mid T1): the game is won. */
	| { readonly type: "victory"; readonly team: Team }
