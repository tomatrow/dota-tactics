/**
 * Abilities (DESIGN.md §13). Each is data; the sim resolves its effect by kind. Every use costs a
 * full gauge, like an attack.
 */
import type { Infliction } from "./statuses.ts"

export type AbilityId = "firstAid" | "rendSpeed" | "bodySlam" | "fire" | "blizzard" | "fira"

export type AbilityEffect =
	/** Heals the caster this percent of its HP. */
	| { readonly kind: "heal"; readonly percent: number }
	/**
	 * A weapon blow (it rolls to hit) with ATK times `power`; the caster takes `recoil` percent of
	 * the damage dealt.
	 */
	| { readonly kind: "strike"; readonly power: number; readonly recoil: number }
	/** A weapon blow that does no damage (it rolls to hit) and inflicts a status. */
	| { readonly kind: "debuff"; readonly inflicts: Infliction }
	/**
	 * A spell: magic damage (power × MATK/50 − RES/2, §12) to every enemy in its area, and maybe a
	 * status. It never misses, whichever way the target faces.
	 */
	| { readonly kind: "magic"; readonly power: number; readonly inflicts?: Infliction }

export interface Ability {
	readonly id: AbilityId
	readonly name: string
	readonly mp: number
	/**
	 * What it's aimed at: the caster, an enemy, or a tile. A tile ability can also be aimed at an
	 * enemy: it follows the enemy until it's used, and lands where the enemy stands then.
	 */
	readonly target: "self" | "enemy" | "tile"
	/** Tiles (Manhattan) from the caster to its target; 0 for the caster itself. */
	readonly reach: number
	/** Tiles (Manhattan) round the aimed tile it hits; 0 for the target alone. */
	readonly area: number
	/**
	 * Seconds from the cast to the effect (FFT's charge time); 0 for instant. The tile is fixed
	 * when the cast starts, so whoever leaves the area in time is spared (§12).
	 */
	readonly charge: number
	readonly effect: AbilityEffect
	/** False until its rules are built: the HUD lists it, nobody can use it. */
	readonly enabled: boolean
}

export const ABILITIES: Record<AbilityId, Ability> = {
	firstAid: {
		id: "firstAid",
		name: "First Aid",
		mp: 0,
		target: "self",
		reach: 0,
		area: 0,
		charge: 0,
		effect: { kind: "heal", percent: 25 },
		enabled: true
	},
	rendSpeed: {
		id: "rendSpeed",
		name: "Rend Speed",
		mp: 10,
		target: "enemy",
		reach: 2,
		area: 0,
		charge: 0,
		effect: { kind: "debuff", inflicts: { status: "slow", seconds: 15 } },
		enabled: true
	},
	bodySlam: {
		id: "bodySlam",
		name: "Body Slam",
		// More than an action's 10 MP, so it can't be used every action: it's banked for the kill.
		mp: 20,
		target: "enemy",
		reach: 2,
		area: 0,
		charge: 0,
		effect: { kind: "strike", power: 1.6, recoil: 10 },
		enabled: true
	},
	fire: {
		id: "fire",
		name: "Fire",
		mp: 8,
		target: "tile",
		reach: 10,
		area: 1,
		charge: 0,
		// 180 on a creep, 173 on the Warrior: about a Warrior's blow.
		effect: { kind: "magic", power: 150 },
		enabled: true
	},
	blizzard: {
		id: "blizzard",
		name: "Blizzard",
		mp: 8,
		target: "enemy",
		reach: 10,
		area: 0,
		charge: 0,
		effect: { kind: "magic", power: 110, inflicts: { status: "chill", seconds: 3 } },
		enabled: true
	},
	fira: {
		id: "fira",
		name: "Fira",
		mp: 16,
		target: "tile",
		reach: 10,
		area: 3,
		charge: 2,
		effect: { kind: "magic", power: 250 },
		enabled: true
	}
}

/** Whether an ability can be used on a structure: weapon blows can; spells and statuses can't (Dota). */
export const hitsStructures = (ability: Ability): boolean => ability.effect.kind === "strike"

/**
 * Whether a hero goes on attacking the enemy it used an ability on: after a weapon technique it
 * does; after a spell it goes back to what it was doing (a mage shouldn't walk in to club).
 */
export const followsUp = (ability: Ability): boolean =>
	ability.effect.kind === "strike" || ability.effect.kind === "debuff"
