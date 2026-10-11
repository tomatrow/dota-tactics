import { describe, expect, it } from "vitest"
import { LaneLine } from "./lane-line.ts"

describe("LaneLine", () => {
	// East along row 0, then north up column 10: 20 tiles long.
	const line = new LaneLine([
		[0.5, 0.5],
		[10.5, 0.5],
		[10.5, 10.5]
	])

	it("measures how far down the lane a tile is, from its nearest point", () => {
		expect(line.length).toBe(20)
		expect(line.along(0, 0)).toBe(0)
		expect(line.along(5, 0)).toBe(5)
		expect(line.along(5, 3)).toBe(5)
		expect(line.along(10, 5)).toBe(15)
		expect(line.along(14, 5)).toBe(15)
	})

	it("says how far off the line a tile is", () => {
		expect(line.offset(5, 0)).toBe(0)
		expect(line.offset(5, 3)).toBe(3)
		expect(line.offset(14, 5)).toBe(4)
	})

	it("finds the tile a distance down the lane, clamped to its ends", () => {
		expect(line.tileAt(5)).toEqual([5, 0])
		expect(line.tileAt(15)).toEqual([10, 5])
		expect(line.tileAt(-3)).toEqual([0, 0])
		expect(line.tileAt(99)).toEqual([10, 10])
	})
})
