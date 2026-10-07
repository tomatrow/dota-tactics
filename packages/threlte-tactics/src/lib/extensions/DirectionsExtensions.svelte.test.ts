import { describe, expect, test } from "vitest"
import { Directions } from "#lib/enums/Directions.ts"
import { Point } from "#lib/model/Point.ts"
import { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { getDirection, getNormal, toEuler } from "./DirectionsExtensions.ts"

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

	test("getDirection of an offset prefers north/south... in Unity's order", () => {
		expect(getDirection(Point.of(1, 1))).toBe(Directions.North)
		expect(getDirection(Point.of(1, -1))).toBe(Directions.East)
		expect(getDirection(Point.of(-1, -1))).toBe(Directions.South)
		expect(getDirection(Point.of(-1, 0))).toBe(Directions.West)
	})

	test("getNormal and getDirection round-trip", () => {
		for (const d of Object.values(Directions)) expect(getDirection(getNormal(d))).toBe(d)
	})

	test("toEuler turns clockwise from north in 90° steps", () => {
		expect(toEuler(Directions.North)).toEqual([0, 0, 0])
		expect(toEuler(Directions.West)).toEqual([0, 270, 0])
	})
})
