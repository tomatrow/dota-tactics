import { describe, expect, it } from "vitest"
import { pathLength, pointAlong, type Point2 } from "./path.ts"

const corner: Point2[] = [
	[0, 0],
	[300, 0],
	[300, 400]
]

describe("pathLength", () => {
	it("sums the segments", () => {
		expect(pathLength(corner)).toBe(700)
	})

	it("is 0 for a single point", () => {
		expect(pathLength([[5, 5]])).toBe(0)
	})
})

describe("pointAlong", () => {
	it("interpolates within the first segment", () => {
		expect(pointAlong(corner, 150)).toEqual([150, 0])
	})

	it("carries on round a corner", () => {
		expect(pointAlong(corner, 500)).toEqual([300, 200])
	})

	it("clamps to the ends", () => {
		expect(pointAlong(corner, -10)).toEqual([0, 0])
		expect(pointAlong(corner, 10_000)).toEqual([300, 400])
	})

	it("skips zero-length segments", () => {
		expect(
			pointAlong(
				[
					[0, 0],
					[0, 0],
					[10, 0]
				],
				5
			)
		).toEqual([5, 0])
	})
})
