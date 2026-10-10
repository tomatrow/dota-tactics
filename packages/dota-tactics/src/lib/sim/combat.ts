import { isCreep, type UnitStats } from "#lib/content/units.ts"
import { TUNING } from "#lib/content/tuning.ts"
import type { Exposure } from "./grid.ts"

/** How much of the target's evasion applies from each side (FFTA). */
const EVASION_SHARE: Record<Exposure, number> = { front: 1, side: 0.5, back: 0 }

/**
 * Percent chance an attack hits (DESIGN.md §12): structures never miss; otherwise the base chance
 * less the target's evasion from the side it's hit on, less the uphill miss when the target
 * stands higher.
 */
export function hitChance(
	attacker: UnitStats,
	target: UnitStats,
	side: Exposure,
	uphill: boolean
): number {
	if (attacker.structure) return 100
	const chance =
		TUNING.baseHit - target.evasion * EVASION_SHARE[side] - (uphill ? TUNING.uphillMiss : 0)
	return Math.max(0, Math.min(100, chance))
}

/**
 * Physical damage (DESIGN.md §12): ATK − DEF/2, at least `minDamage`% of ATK, in whole points.
 * ATK is first multiplied by an ability's `power`, and by the attacker's `vsStructures` against a
 * structure, `vsCreeps` against a lane creep.
 */
export function physicalDamage(attacker: UnitStats, target: UnitStats, power = 1): number {
	const multiplier =
		target.structure ? attacker.vsStructures
		: isCreep(target) ? attacker.vsCreeps
		: 1
	const atk = attacker.atk * multiplier * power
	const floor = Math.ceil((atk * TUNING.minDamage) / 100)
	return Math.max(floor, Math.floor(atk - target.def / 2))
}

/**
 * Magic damage (DESIGN.md §12): power × MATK/50 − RES/2, at least `minDamage`% of power × MATK/50,
 * in whole points. Spells take no multipliers: they never hit structures.
 */
export function magicDamage(caster: UnitStats, target: UnitStats, power: number): number {
	const base = (power * caster.matk) / 50
	const floor = Math.ceil((base * TUNING.minDamage) / 100)
	return Math.max(floor, Math.floor(base - target.res / 2))
}
