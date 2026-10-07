import { describe, expect, test } from "vitest"
import { Directions } from "#lib/enums/Directions.ts"
import type { LevelData } from "#lib/model/LevelData.ts"
import { Point } from "#lib/model/Point.ts"
import { Board } from "../Board.svelte.ts"
import { Unit } from "../Unit.svelte.ts"
import { FlyMovement } from "./FlyMovement.ts"
import type { Movement } from "./Movement.ts"
import { TeleportMovement } from "./TeleportMovement.ts"
import { WalkMovement } from "./WalkMovement.ts"

/** A board from rows of heights (row 0 is y = 0); `.` is a hole. */
function board(...rows: string[]): Board {
	const tiles: LevelData["tiles"] = []
	rows.forEach((row, y) => {
		;[...row].forEach((h, x) => {
			if (h !== ".") tiles.push([x, Number(h), y])
		})
	})
	const b = new Board()
	b.load({ tiles })
	return b
}

type MovementClass = new (unit: Unit) => Movement

function unitAt(b: Board, x: number, y: number, Kind: MovementClass, range = 5, jumpHeight = 1) {
	const unit = new Unit({ name: "Hero", model: "Hero" })
	unit.place(b.getTile(Point.of(x, y)))
	unit.match()
	const movement = new Kind(unit)
	movement.range = range
	movement.jumpHeight = jumpHeight
	unit.movement = movement
	return { unit, movement }
}

const positions = (tiles: { pos: Point }[]) => tiles.map((t) => `${t.pos}`).sort()

describe("getTilesInRange", () => {
	test("is limited by range and leaves out the unit's own tile", () => {
		const b = board("11111")
		const { movement } = unitAt(b, 0, 0, TeleportMovement, 2)
		expect(positions(movement.getTilesInRange(b))).toEqual(["(1,0)", "(2,0)"])
	})

	test("walking can't climb or drop more than the jump height", () => {
		const b = board("1231")
		const { movement } = unitAt(b, 0, 0, WalkMovement, 5, 1)
		expect(positions(movement.getTilesInRange(b))).toEqual(["(1,0)", "(2,0)"])
	})

	test.each([
		// Walking goes round the blocker, so (2,0) is 4 steps away.
		[WalkMovement, ["(0,1)", "(1,1)", "(2,1)"]],
		// Flying and teleporting pass over it (but can't stop on it).
		[FlyMovement, ["(0,1)", "(1,1)", "(2,0)", "(2,1)"]],
		[TeleportMovement, ["(0,1)", "(1,1)", "(2,0)", "(2,1)"]]
	] as const)("%o and a unit in the way", (Kind, expected) => {
		const b = board("111", "111")
		unitAt(b, 1, 0, WalkMovement)
		const { movement } = unitAt(b, 0, 0, Kind, 3)
		expect(positions(movement.getTilesInRange(b))).toEqual(expected)
	})

	test("flying ignores heights", () => {
		const b = board("1911")
		const { movement } = unitAt(b, 0, 0, FlyMovement, 3, 0)
		expect(positions(movement.getTilesInRange(b))).toEqual(["(1,0)", "(2,0)", "(3,0)"])
	})
})

describe("traverse", () => {
	test("walking turns, walks and jumps along the path, then stands on the tile", async () => {
		const b = board("11", ".2")
		const { unit, movement } = unitAt(b, 0, 0, WalkMovement)
		const target = b.getTile(Point.of(1, 1))!
		movement.getTilesInRange(b)

		await movement.traverse(target)

		expect(unit.tile).toBe(target)
		expect(target.content).toBe(unit)
		expect(b.getTile(Point.of(0, 0))!.content).toBeNull()
		expect(unit.transform.localPosition).toEqual([1, 0.5, 1])
		// East, then north again.
		expect(unit.dir).toBe(Directions.North)
		expect(unit.transform.localEulerAngles).toEqual([0, 0, 0])
		// Like Unity's `Jump`, `traverse` waits for the move, not the hop, which can land a frame
		// later.
		await expect.poll(() => unit.jumper.localPosition).toEqual([0, 0, 0])
	})

	test("teleporting shrinks away and grows back on the target", async () => {
		const b = board("111")
		const { unit, movement } = unitAt(b, 0, 0, TeleportMovement)
		const target = b.getTile(Point.of(2, 0))!
		movement.getTilesInRange(b)

		await movement.traverse(target)

		expect(unit.transform.localPosition).toEqual([2, 0.25, 0])
		expect(unit.transform.localScale).toEqual([1, 1, 1])
		expect(unit.jumper.localEulerAngles).toEqual([0, 0, 0])
	})
})

test("turning from north to west goes the short way round", async () => {
	const b = board("1")
	const { unit, movement } = unitAt(b, 0, 0, WalkMovement)
	const angles: number[] = []
	const turning = (movement as unknown as { turn(d: Directions): Promise<void> }).turn(
		Directions.West
	)
	expect(unit.dir).toBe(Directions.West)
	const sample = setInterval(() => angles.push(unit.transform.localEulerAngles[1]), 20)
	await turning
	clearInterval(sample)

	// 360 → 270 (counter-clockwise), never through 90 or 180.
	expect(angles.every((y) => y === 0 || y >= 270)).toBe(true)
	expect(unit.transform.localEulerAngles[1]).toBe(270)
})
