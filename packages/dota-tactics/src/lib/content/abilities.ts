/**
 * Abilities (DESIGN.md §13). Each is data; the sim resolves its effect by kind. Every use costs a
 * full gauge, like an attack.
 */

export type AbilityId = "firstAid" | "rendSpeed" | "bodySlam"

export type AbilityEffect =
	/** Heals the caster this percent of its HP. */
	| { readonly kind: "heal"; readonly percent: number }
	/**
	 * A physical attack with ATK times `power`; the caster takes `recoil` percent of the damage
	 * dealt.
	 */
	| { readonly kind: "strike"; readonly power: number; readonly recoil: number }
	/** Lowers the target's speed by `speed` for `seconds`. */
	| { readonly kind: "slow"; readonly speed: number; readonly seconds: number }

export interface Ability {
	readonly id: AbilityId
	readonly name: string
	readonly mp: number
	/** Who it's used on. */
	readonly target: "self" | "enemy"
	/** Tiles (Manhattan) to an enemy target; 0 for the caster itself. */
	readonly reach: number
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
		effect: { kind: "heal", percent: 25 },
		enabled: true
	},
	rendSpeed: {
		id: "rendSpeed",
		name: "Rend Speed",
		mp: 10,
		target: "enemy",
		reach: 2,
		effect: { kind: "slow", speed: 6, seconds: 15 },
		// Needs status effects (milestone 4).
		enabled: false
	},
	bodySlam: {
		id: "bodySlam",
		name: "Body Slam",
		// More than an action's 10 MP, so it can't be used every action: it's banked for the kill.
		mp: 20,
		target: "enemy",
		reach: 2,
		effect: { kind: "strike", power: 1.6, recoil: 10 },
		enabled: true
	}
}
