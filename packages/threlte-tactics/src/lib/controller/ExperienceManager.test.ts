import { describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Rank } from "#lib/view-model-component/actor/Rank.ts"
import { Stats } from "#lib/view-model-component/actor/Stats.ts"
import { awardExperience } from "./ExperienceManager.ts"

function party(...levels: (number | null)[]) {
	const notifications = new NotificationCenter()
	return levels.map((level) => {
		if (level === null) return { rank: null }
		const rank = new Rank(new Stats(notifications), notifications)
		rank.init(level)
		return { rank }
	})
}

const gained = (members: { rank: Rank | null }[], levels: number[]) =>
	members.map((m, i) => m.rank!.exp - Rank.experienceForLevel(levels[i]!))

describe("awardExperience", () => {
	test("gives the lowest levels the biggest share (1.5 : 0.5 weights)", () => {
		const members = party(1, 3, 5)
		awardExperience(1000, members)
		// Weights 1.5, 1, 0.5 of 3.
		expect(gained(members, [1, 3, 5])).toEqual([500, 333, 166])
	})

	test("skips members without a rank", () => {
		const members = party(2, null, 4)
		awardExperience(100, members.slice())
		expect(members[0]!.rank!.exp - Rank.experienceForLevel(2)).toBe(75)
		expect(members[2]!.rank!.exp - Rank.experienceForLevel(4)).toBe(25)
	})

	test("splits evenly between equal levels (PORT-FIX: Unity awards nothing)", () => {
		const members = party(4, 4)
		awardExperience(101, members)
		expect(gained(members, [4, 4])).toEqual([50, 50])
	})
})
