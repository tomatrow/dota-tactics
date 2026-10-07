import { describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { AddValueModifier } from "#lib/exceptions/modifiers/AddValueModifier.ts"
import { Rank } from "./Rank.ts"
import { Stats } from "./Stats.ts"

function actor(level: number) {
	const notifications = new NotificationCenter()
	const stats = new Stats(notifications)
	const rank = new Rank(stats, notifications)
	rank.init(level)
	return { notifications, stats, rank }
}

describe("Rank", () => {
	test("converts between levels and experience for every level (TestLevelGrowth)", () => {
		for (let i = 1; i < 100; ++i)
			expect(Rank.levelForExperience(Rank.experienceForLevel(i))).toBe(i)
	})

	test("follows an ease-in curve, in 32-bit floats like Unity", () => {
		expect(Rank.experienceForLevel(1)).toBe(0)
		expect(Rank.experienceForLevel(2)).toBe(104)
		expect(Rank.experienceForLevel(99) - Rank.experienceForLevel(98)).toBe(20304)
		expect(Rank.experienceForLevel(99)).toBe(999999)
		expect(Rank.experienceForLevel(150)).toBe(999999)
		expect(Rank.levelForExperience(103)).toBe(1)
		expect(Rank.levelForExperience(2_000_000)).toBe(99)
	})

	test("init sets the level and its experience", () => {
		const { rank } = actor(10)
		expect([rank.lvl, rank.exp]).toEqual([10, Rank.experienceForLevel(10)])
		expect(rank.levelPercent).toBeCloseTo(9 / 98)
	})

	test("gaining experience levels up", () => {
		const { rank } = actor(1)
		rank.exp += 104
		expect(rank.lvl).toBe(2)
		rank.exp = Rank.experienceForLevel(10) - 1
		expect(rank.lvl).toBe(9)
	})

	test("experience never decreases or passes the maximum", () => {
		const { rank, stats } = actor(5)
		const exp = rank.exp
		rank.exp -= 50
		expect(rank.exp).toBe(exp)
		rank.exp = 5_000_000
		expect([rank.exp, rank.lvl]).toEqual([999999, 99])
		// Init doesn't go through the exception.
		rank.init(3)
		expect(stats.get(StatTypes.LVL)).toBe(3)
	})

	test("clamps after every other modifier", () => {
		const { rank, notifications, stats } = actor(1)
		notifications.addObserver(
			(_sender, exc) => exc.addModifier(new AddValueModifier(1000, 2_000_000)),
			"Stats.EXPWillChange",
			stats
		)
		rank.exp += 1
		expect(rank.exp).toBe(999999)
	})

	test("stops listening when disabled", () => {
		const { rank, stats } = actor(1)
		rank.disable()
		stats.set(StatTypes.EXP, 1000)
		expect(rank.lvl).toBe(1)
	})
})
