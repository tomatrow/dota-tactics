import type { Exposure } from "./grid.ts"
import type { Unit } from "./unit.ts"

/** What happened in a tick, in the order it happened: for the view, telemetry and tests. */
export type SimEvent =
	| { readonly type: "spawn"; readonly unit: Unit }
	| {
			readonly type: "attack"
			readonly attacker: Unit
			readonly target: Unit
			readonly hit: boolean
			readonly damage: number
			readonly side: Exposure
	  }
	| { readonly type: "death"; readonly unit: Unit; readonly killer: Unit | null }
