import { Vector3 } from "three"
import { describe, expect, test } from "vitest"
import { Directions } from "#lib/enums/Directions.ts"
import { Point } from "#lib/model/Point.ts"
import { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { getDirection, getNormal, toYaw } from "./DirectionsExtensions.ts"

function tile(x: number, y: number): Tile {
	const t = new Tile()
	t.load(Point.of(x, y), 1)
	return t
}

describe("DirectionsExtensions", () => {
	test("getDirection between neighbouring tiles: north is +y, east is +x", () => {
		const center = tile(0, 0)
		expect(getDirection(center, tile(0, 1))).toBe(Directions.North)
		expect(getDirection(center, tile(1, 0))).toBe(Directions.East)
		expect(getDirection(center, tile(0, -1))).toBe(Directions.South)
		expect(getDirection(center, tile(-1, 0))).toBe(Directions.West)
	})

	test("getDirection of a diagonal offset prefers north, then east, south, west", () => {
		expect(getDirection(Point.of(1, 1))).toBe(Directions.North)
		expect(getDirection(Point.of(1, -1))).toBe(Directions.East)
		expect(getDirection(Point.of(-1, -1))).toBe(Directions.South)
		expect(getDirection(Point.of(-1, 0))).toBe(Directions.West)
	})

	test("getNormal and getDirection round-trip", () => {
		for (const d of Object.values(Directions)) expect(getDirection(getNormal(d))).toBe(d)
	})

	test("toYaw turns something facing −Z (north) towards the direction's normal", () => {
		expect(toYaw(Directions.North)).toBe(0)
		for (const d of Object.values(Directions)) {
			const forward = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), toYaw(d))
			const normal = getNormal(d)
			expect(forward.x).toBeCloseTo(normal.x)
			expect(forward.z).toBeCloseTo(-normal.y)
		}
	})
})
