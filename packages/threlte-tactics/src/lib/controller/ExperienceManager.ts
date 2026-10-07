import { lerp } from "#lib/common/unity/mathf.ts"
import type { Rank } from "#lib/view-model-component/actor/Rank.ts"

/** Port of `Controller/ExperienceManager.cs`: shares experience between a party. */

const minLevelBonus = 1.5
const maxLevelBonus = 0.5

/** Unity's `Party` (a list of GameObjects); members without a rank are skipped. */
export type Party = readonly { readonly rank: Rank | null }[]

/** Splits `amount` between the party's ranks, giving lower levels a bigger share. */
export function awardExperience(amount: number, party: Party): void {
	// Grab a list of all of the rank components from our hero party
	const ranks: Rank[] = []
	for (const member of party) if (member.rank !== null) ranks.push(member.rank)

	// Step 1: determine the range in actor level stats
	let min = Number.MAX_SAFE_INTEGER
	let max = Number.MIN_SAFE_INTEGER
	for (let i = ranks.length - 1; i >= 0; --i) {
		min = Math.min(ranks[i]!.lvl, min)
		max = Math.max(ranks[i]!.lvl, max)
	}

	// Step 2: weight the amount to award per actor based on their level
	const weights: number[] = new Array<number>(ranks.length)
	let summedWeights = 0
	for (let i = ranks.length - 1; i >= 0; --i) {
		// PORT-FIX: Unity divides 0 by 0 when every level is the same; the NaN weights award nothing.
		const percent = max === min ? 0 : (ranks[i]!.lvl - min) / (max - min)
		weights[i] = lerp(minLevelBonus, maxLevelBonus, percent)
		summedWeights += weights[i]!
	}

	// Step 3: hand out the weighted award
	for (let i = ranks.length - 1; i >= 0; --i) {
		const subAmount = Math.floor((weights[i]! / summedWeights) * amount)
		ranks[i]!.exp += subAmount
	}
}
