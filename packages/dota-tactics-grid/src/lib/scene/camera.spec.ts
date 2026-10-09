import { describe, expect, it } from "vitest"
import { frustum, quarterTurn } from "./camera.ts"

describe("quarterTurn", () => {
	const q = Math.PI / 2

	it("turns 90° from a diagonal", () => {
		expect(quarterTurn(-q / 2, 1)).toBeCloseTo(q / 2)
		expect(quarterTurn(-q / 2, -1)).toBeCloseTo(-q * 1.5)
	})

	it("snaps to the nearest diagonal first", () => {
		expect(quarterTurn(-q / 2 + 0.3, 1)).toBeCloseTo(q / 2)
		expect(quarterTurn(q / 2 - 0.3, -1)).toBeCloseTo(-q / 2)
	})

	it("keeps counting past a full turn", () => {
		expect(quarterTurn(4 * q + q / 2, 1)).toBeCloseTo(5 * q + q / 2)
	})
})

describe("frustum", () => {
	it("fits the board's width on tall screens and its height on wide ones", () => {
		expect(frustum(1000, 1000)).toEqual({ halfWidth: 215, halfHeight: 215 })
		expect(frustum(1600, 800)).toEqual({ halfWidth: 300, halfHeight: 150 })
	})
})
