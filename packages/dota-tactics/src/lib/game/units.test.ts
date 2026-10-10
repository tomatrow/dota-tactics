import { describe, expect, it } from "vitest"
import { Facing } from "#lib/sim/grid.ts"
import { facingYaw, lunge, LUNGE_TIME, projectileAt, turnToward } from "./units.ts"

/** Where a model's front (−Z) points after turning by `yaw` about +Y. */
const front = (yaw: number) => [-Math.sin(yaw), -Math.cos(yaw)]

describe("facingYaw", () => {
	it("turns the model's front to face each way", () => {
		const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i]))
		close(front(facingYaw(Facing.north)), [0, -1])
		close(front(facingYaw(Facing.east)), [1, 0])
		close(front(facingYaw(Facing.south)), [0, 1])
		close(front(facingYaw(Facing.west)), [-1, 0])
	})
})

describe("lunge", () => {
	it("goes out and comes back", () => {
		expect(lunge(0)).toBe(0)
		expect(lunge(LUNGE_TIME / 2)).toBeCloseTo(0.35)
		expect(lunge(LUNGE_TIME)).toBe(0)
	})

	it("is still outside the lunge", () => {
		expect(lunge(-0.1)).toBe(0)
		expect(lunge(1)).toBe(0)
	})
})

describe("projectileAt", () => {
	it("starts and ends at the ends", () => {
		expect(projectileAt([0, 1, 0], [4, 1, 0], 0, 2)).toEqual([0, 1, 0])
		expect(projectileAt([0, 1, 0], [4, 1, 0], 1, 2)[0]).toBe(4)
	})

	it("arcs highest in the middle", () => {
		const [x, y] = projectileAt([0, 1, 0], [4, 1, 0], 0.5, 2)
		expect(x).toBe(2)
		expect(y).toBeCloseTo(3)
	})
})

describe("turnToward", () => {
	it("turns the short way round", () => {
		expect(turnToward(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4)
		// From just under a full turn to just over zero: forwards across 2π, not back.
		expect(turnToward(1.9 * Math.PI, 0.1 * Math.PI, 0.5)).toBeCloseTo(2 * Math.PI)
		expect(turnToward(0.1 * Math.PI, -0.1 * Math.PI, 1)).toBeCloseTo(-0.1 * Math.PI)
	})

	it("arrives at t = 1 and stays put at t = 0", () => {
		expect(turnToward(1, 2, 1)).toBeCloseTo(2)
		expect(turnToward(1, 2, 0)).toBe(1)
	})
})
