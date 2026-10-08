import { Directions } from "#lib/enums/Directions.ts"
import { Targets } from "#lib/enums/Targets.ts"
import { Point } from "#lib/model/Point.ts"
import type { Ability } from "#lib/view-model-component/ability/Ability.ts"

/**
 * Port of `View Model Component/AI/PlanOfAttack.cs`: what a computer-driven unit will do this
 * turn. Its attack pattern picks the ability and whom it is for; `ComputerPlayer` decides where to
 * move, and where to aim or which way to face.
 */
export class PlanOfAttack {
	/** `null`: don't use one. */
	ability: Ability | null = null
	target: Targets = Targets.None
	moveLocation: Point = Point.zero
	fireLocation: Point = Point.zero
	attackDirection: Directions = Directions.North
}
