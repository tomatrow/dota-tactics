import { describe, expect, it } from "vitest"
import { JOBS } from "./heroes.ts"
import { changes, defaultRules, formatChanges, numbers, parseChanges, setNumber } from "./rules.ts"
import { TUNING } from "./tuning.ts"

describe("rules", () => {
	it("copies the content, so tuning one game changes neither the content nor another game", () => {
		const a = defaultRules()
		const b = defaultRules()
		expect(setNumber(a, "jobs.warrior.stats.speed", 25)).toBe(true)
		expect(a.jobs.warrior.stats.speed).toBe(25)
		expect(b.jobs.warrior.stats.speed).toBe(20)
		expect(JOBS.warrior.stats.speed).toBe(20)
	})

	it("lists every number by its path, nested ones included", () => {
		const all = numbers(defaultRules())
		expect(all.get("tuning.walkCharge")).toBe(TUNING.walkCharge)
		expect(all.get("abilities.fira.charge")).toBe(2)
		expect(all.get("abilities.blizzard.effect.inflicts.seconds")).toBe(3)
		expect(all.get("sentinels.1.atk")).toBe(300)
		expect(all.has("jobs.warrior.stats.kind")).toBe(false)
	})

	it("sets only numbers that exist", () => {
		const rules = defaultRules()
		expect(setNumber(rules, "jobs.warrior.stats.kind", 1)).toBe(false)
		expect(setNumber(rules, "jobs.warrior.stats.nothing", 1)).toBe(false)
		expect(setNumber(rules, "jobs.nobody.stats.hp", 1)).toBe(false)
		expect(setNumber(rules, "jobs.__proto__.hp", 1)).toBe(false)
		expect(setNumber(rules, "tuning.walkCharge", Number.NaN)).toBe(false)
		expect(changes(rules, defaultRules())).toEqual([])
	})

	it("lists what changed, and round-trips it through ?tune= text", () => {
		const rules = defaultRules()
		setNumber(rules, "tuning.walkCharge", 25)
		setNumber(rules, "abilities.fire.mp", 12)
		setNumber(rules, "statuses.slow.speed", -4.5)
		const list = changes(rules, defaultRules())
		expect(list).toEqual([
			["tuning.walkCharge", 25],
			["abilities.fire.mp", 12],
			["statuses.slow.speed", -4.5]
		])
		const text = formatChanges(list)
		expect(text).toBe("tuning.walkCharge:25,abilities.fire.mp:12,statuses.slow.speed:-4.5")
		expect(parseChanges(text)).toEqual(list)
		expect(parseChanges("tuning.walkCharge:x,,nope,a.b:1")).toEqual([["a.b", 1]])
	})
})
