import { describe, expect, it } from "vitest"
import { JOBS } from "#lib/content/heroes.ts"
import { CREEPS, SENTINELS, type UnitStats } from "#lib/content/units.ts"
import { hitChance, magicDamage, physicalDamage } from "./combat.ts"

const dodgy: UnitStats = { ...CREEPS.melee, evasion: 20 }

describe("hitChance", () => {
	it("is 95 against no evasion", () => {
		expect(hitChance(CREEPS.melee, CREEPS.melee, "front", false)).toBe(95)
	})

	it("takes full evasion from the front, half from the side, none from behind", () => {
		expect(hitChance(CREEPS.melee, dodgy, "front", false)).toBe(75)
		expect(hitChance(CREEPS.melee, dodgy, "side", false)).toBe(85)
		expect(hitChance(CREEPS.melee, dodgy, "back", false)).toBe(95)
	})

	it("loses 25 attacking uphill", () => {
		expect(hitChance(CREEPS.ranged, dodgy, "front", true)).toBe(50)
	})

	it("never misses for a structure", () => {
		expect(hitChance(SENTINELS[1], dodgy, "front", true)).toBe(100)
	})
})

describe("physicalDamage", () => {
	it("is ATK − DEF/2", () => {
		// 80 − 4/2
		expect(physicalDamage(CREEPS.melee, CREEPS.melee)).toBe(78)
	})

	it("is at least 10% of ATK", () => {
		const weak: UnitStats = { ...CREEPS.melee, atk: 50 }
		// 50 − 130/2 < 5
		expect(physicalDamage(weak, SENTINELS[1])).toBe(5)
	})

	it("multiplies a Sentinel's ATK against creeps only", () => {
		// 300 × 1.5 − 4/2
		expect(physicalDamage(SENTINELS[1], CREEPS.melee)).toBe(448)
		// A hero takes the plain 300 − 30/2.
		expect(physicalDamage(SENTINELS[1], JOBS.warrior.stats)).toBe(285)
	})

	it("multiplies ATK by an ability's power", () => {
		// 180 × 1.6 − 4/2
		expect(physicalDamage(JOBS.warrior.stats, CREEPS.melee, 1.6)).toBe(286)
	})

	it("multiplies ATK against structures for siege", () => {
		// 100 × 2.5 − 130/2
		expect(physicalDamage(CREEPS.siege, SENTINELS[1])).toBe(185)
		// No bonus against units.
		expect(physicalDamage(CREEPS.siege, CREEPS.ranged)).toBe(100)
	})
})

describe("magicDamage", () => {
	const mage = JOBS.blackMage.stats

	it("is power × MATK/50 − RES/2", () => {
		expect(magicDamage(mage, CREEPS.melee, 150)).toBe(180)
		expect(magicDamage(mage, JOBS.warrior.stats, 150)).toBe(173)
		expect(magicDamage(mage, JOBS.warrior.stats, 250)).toBe(293)
	})

	it("is at least 10% of power × MATK/50", () => {
		expect(magicDamage(mage, { ...CREEPS.melee, res: 1000 }, 150)).toBe(18)
	})
})
