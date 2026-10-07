import { describe, expect, test } from "vitest"
import { Point } from "./Point.ts"

describe("Point", () => {
	test("is interned, so === is value equality", () => {
		expect(Point.of(1, 2)).toBe(Point.of(1, 2))
		expect(Point.of(1, 2)).not.toBe(Point.of(2, 1))
		expect(Point.of(1, 2).equals(Point.of(1, 2))).toBe(true)
	})

	test("adds and subtracts", () => {
		expect(Point.of(1, 2).add(Point.of(3, -4))).toBe(Point.of(4, -2))
		expect(Point.of(1, 2).sub(Point.of(3, -4))).toBe(Point.of(-2, 6))
	})

	test("keys a Map by value", () => {
		const map = new Map([[Point.of(3, 4), "tile"]])
		expect(map.get(Point.of(3, 4))).toBe("tile")
	})

	test("formats like Unity", () => {
		expect(`${Point.of(-1, 7)}`).toBe("(-1,7)")
	})
})
