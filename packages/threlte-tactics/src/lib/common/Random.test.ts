import { describe, expect, test } from "vitest"
import { Random } from "./Random.ts"

describe("Random", () => {
	test("repeats for a seed", () => {
		const a = new Random(42)
		const b = new Random(42)
		const c = new Random(43)
		const values = [a.value(), a.value(), a.value()]
		expect([b.value(), b.value(), b.value()]).toEqual(values)
		expect([c.value(), c.value(), c.value()]).not.toEqual(values)
	})

	test("values are in [0, 1)", () => {
		const random = new Random(1)
		for (let i = 0; i < 10_000; ++i) {
			const v = random.value()
			expect(v >= 0 && v < 1).toBe(true)
		}
	})

	test("int excludes max", () => {
		const random = new Random(7)
		const seen = new Set<number>()
		for (let i = 0; i < 1000; ++i) seen.add(random.int(9, 12))
		expect([...seen].sort((a, b) => a - b)).toEqual([9, 10, 11])
		expect(random.int(3, 3)).toBe(3)
	})

	test("float stays in [min, max)", () => {
		const random = new Random(7)
		for (let i = 0; i < 1000; ++i) {
			const v = random.float(0.9, 1.1)
			expect(v >= 0.9 && v < 1.1).toBe(true)
		}
	})
})
