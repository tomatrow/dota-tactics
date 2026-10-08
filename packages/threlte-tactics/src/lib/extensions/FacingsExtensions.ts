import { dot, normalized } from "#lib/common/unity/vector2.ts"
import { Facings } from "#lib/enums/Facings.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { getNormal } from "./DirectionsExtensions.ts"

/** Port of `Extensions/FacingsExtensions.cs`. */

/** Which side of `target` `attacker` attacks from, given the way `target` faces. */
export function getFacing(attacker: Unit, target: Unit): Facings {
	const { x, y } = getNormal(target.dir)
	const approach = target.tile!.pos.sub(attacker.tile!.pos)
	const d = dot(normalized([approach.x, approach.y]), [x, y])
	if (d >= 0.45) return Facings.Back
	if (d <= -0.45) return Facings.Front
	return Facings.Side
}
