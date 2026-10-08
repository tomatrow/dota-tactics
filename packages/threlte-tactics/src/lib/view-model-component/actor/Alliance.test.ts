import { describe, expect, test } from "vitest"
import { Alliances } from "#lib/enums/Alliances.ts"
import { Targets } from "#lib/enums/Targets.ts"
import { Alliance } from "./Alliance.ts"

describe("Alliance", () => {
	const hero = new Alliance(Alliances.Hero)
	const otherHero = new Alliance(Alliances.Hero)
	const enemy = new Alliance(Alliances.Enemy)
	const neutral = new Alliance(Alliances.Neutral)

	test("self: the same alliance component", () => {
		expect([hero.isMatch(hero, Targets.Self), hero.isMatch(otherHero, Targets.Self)]).toEqual([
			true,
			false
		])
	})

	test("allies: the same type", () => {
		expect([otherHero, enemy].map((other) => hero.isMatch(other, Targets.Ally))).toEqual([
			true,
			false
		])
	})

	test("foes: another type, but not neutral", () => {
		expect([otherHero, enemy, neutral].map((other) => hero.isMatch(other, Targets.Foe))).toEqual([
			false,
			true,
			false
		])
	})

	test("none and tile match nothing", () => {
		expect([Targets.None, Targets.Tile].map((t) => hero.isMatch(hero, t))).toEqual([false, false])
	})

	test("confused: the opposite", () => {
		const confused = new Alliance(Alliances.Hero)
		confused.confused = true
		expect([enemy, otherHero].map((other) => confused.isMatch(other, Targets.Foe))).toEqual([
			false,
			true
		])
	})
})
