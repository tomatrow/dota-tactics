import { describe, expect, it } from "vitest"
import { exposure, Facing, facingToward, footprintDistance } from "./grid.ts"

describe("facingToward", () => {
	it("points along the larger axis", () => {
		expect(facingToward(3, 1, Facing.north)).toBe(Facing.east)
		expect(facingToward(-3, 1, Facing.north)).toBe(Facing.west)
		expect(facingToward(1, 3, Facing.east)).toBe(Facing.north)
		expect(facingToward(1, -3, Facing.east)).toBe(Facing.south)
	})

	it("prefers north/south on a tie", () => {
		expect(facingToward(2, 2, Facing.west)).toBe(Facing.north)
		expect(facingToward(2, -2, Facing.west)).toBe(Facing.south)
	})

	it("keeps the fallback without a direction", () => {
		expect(facingToward(0, 0, Facing.west)).toBe(Facing.west)
	})
})

describe("exposure", () => {
	it("is the front when the attacker is ahead", () => {
		expect(exposure(Facing.north, 0, 2)).toBe("front")
	})

	it("is the back when the attacker is behind", () => {
		expect(exposure(Facing.north, 0, -1)).toBe("back")
		expect(exposure(Facing.east, -4, 1)).toBe("back")
	})

	it("is a side otherwise", () => {
		expect(exposure(Facing.north, 1, 0)).toBe("side")
		expect(exposure(Facing.north, -3, 1)).toBe("side")
	})
})

describe("footprintDistance", () => {
	it("is Manhattan between single tiles", () => {
		expect(footprintDistance(0, 0, 0, 3, -2, 0)).toBe(5)
		expect(footprintDistance(4, 4, 0, 4, 5, 0)).toBe(1)
	})

	it("measures to the nearest tile of a 3×3 footprint", () => {
		// The footprint spans cols 9–11, rows 9–11.
		expect(footprintDistance(10, 13, 0, 10, 10, 1)).toBe(2)
		expect(footprintDistance(13, 13, 0, 10, 10, 1)).toBe(4)
		expect(footprintDistance(11, 12, 0, 10, 10, 1)).toBe(1)
	})
})
