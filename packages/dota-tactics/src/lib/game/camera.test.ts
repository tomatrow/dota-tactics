import { describe, expect, it } from "vitest"
import { CAMERA_POLAR, edgeDirection, groundAxes } from "./camera.ts"

const close = (actual: number[], expected: number[]) =>
	actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i]))

describe("groundAxes", () => {
	it("looks north from the south", () => {
		// Azimuth 0: the camera sits on +Z (south) looking towards −Z (north).
		const { right, forward } = groundAxes(0)
		close(right, [1, 0])
		close(forward, [0, -1])
	})

	it("turns with the camera", () => {
		// Azimuth −90°: the camera sits on −X (west) looking east.
		const { right, forward } = groundAxes(-Math.PI / 2)
		close(right, [0, 1])
		close(forward, [1, 0])
	})
})

describe("edgeDirection", () => {
	it("is still in the middle", () => {
		expect(edgeDirection(500, 300, 1000, 600)).toEqual([0, 0])
	})

	it("pans towards the edge the pointer is at", () => {
		expect(edgeDirection(0, 300, 1000, 600)).toEqual([-1, 0])
		expect(edgeDirection(999, 300, 1000, 600)).toEqual([1, 0])
		expect(edgeDirection(500, 0, 1000, 600)).toEqual([0, 1])
		expect(edgeDirection(500, 599, 1000, 600)).toEqual([0, -1])
	})

	it("pans diagonally in a corner", () => {
		expect(edgeDirection(2, 2, 1000, 600)).toEqual([-1, 1])
	})
})

describe("CAMERA_POLAR", () => {
	it("looks down at the board viewer's angle, between top-down and level", () => {
		expect(CAMERA_POLAR).toBeGreaterThan(0.6)
		expect(CAMERA_POLAR).toBeLessThan(1)
	})
})
