import { describe, expect, test } from "vitest"
import { AddValueModifier } from "./modifiers/AddValueModifier.ts"
import { ClampValueModifier } from "./modifiers/ClampValueModifier.ts"
import { MaxValueModifier } from "./modifiers/MaxValueModifier.ts"
import { MinValueModifier } from "./modifiers/MinValueModifier.ts"
import { MultValueModifier } from "./modifiers/MultValueModifier.ts"
import { BaseException } from "./BaseException.ts"
import { ValueChangeException } from "./ValueChangeException.ts"

describe("BaseException", () => {
	test("flipping the toggle always gives the opposite of the default", () => {
		const exc = new BaseException(true)
		expect(exc.toggle).toBe(true)
		exc.flipToggle()
		exc.flipToggle()
		expect(exc.toggle).toBe(false)
		expect(exc.defaultToggle).toBe(true)
	})
})

describe("ValueChangeException", () => {
	test("allows the change by default and knows its delta", () => {
		const exc = new ValueChangeException(10, 25)
		expect(exc.toggle).toBe(true)
		expect(exc.delta).toBe(15)
		expect(exc.getModifiedValue()).toBe(25)
	})

	test("applies modifiers in sort order, not the order they were added", () => {
		const exc = new ValueChangeException(0, 532)
		exc.addModifier(new AddValueModifier(1, 10))
		exc.addModifier(new MultValueModifier(0, 0))
		expect(exc.getModifiedValue()).toBe(10)

		const other = new ValueChangeException(0, 532)
		other.addModifier(new AddValueModifier(0, 10))
		other.addModifier(new MultValueModifier(1, 0))
		expect(other.getModifiedValue()).toBe(0)
	})

	test("modifiers with the same sort order apply in the order they were added", () => {
		const exc = new ValueChangeException(0, 1)
		exc.addModifier(new AddValueModifier(0, 1))
		exc.addModifier(new MultValueModifier(0, 3))
		exc.addModifier(new AddValueModifier(0, 1))
		expect(exc.getModifiedValue()).toBe(7)
	})

	test("value modifiers", () => {
		const modify = (m: { modify(from: number, to: number): number }, to: number) => m.modify(0, to)
		expect(modify(new ClampValueModifier(0, 5, 10), 3)).toBe(5)
		expect(modify(new ClampValueModifier(0, 5, 10), 12)).toBe(10)
		// Unity's naming: MaxValueModifier keeps the value at least `max`; MinValueModifier at most `min`.
		expect(modify(new MaxValueModifier(0, 5), 3)).toBe(5)
		expect(modify(new MaxValueModifier(0, 5), 8)).toBe(8)
		expect(modify(new MinValueModifier(0, 5), 3)).toBe(3)
		expect(modify(new MinValueModifier(0, 5), 8)).toBe(5)
		expect(modify(new MultValueModifier(0, 1.5), 8)).toBe(12)
		expect(modify(new AddValueModifier(0, -2), 8)).toBe(6)
	})
})
