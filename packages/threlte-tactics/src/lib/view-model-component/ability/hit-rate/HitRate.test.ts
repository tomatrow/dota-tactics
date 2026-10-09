import { describe, expect, test, vi } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/Random.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { Facings } from "#lib/enums/Facings.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { MatchException } from "#lib/exceptions/MatchException.ts"
import { getFacing } from "#lib/extensions/FacingsExtensions.ts"
import { Point } from "#lib/model/Point.ts"
import { board } from "#lib/testing/board.ts"
import { BlindStatusEffect } from "#lib/view-model-component/status/effects/BlindStatusEffect.ts"
import { StopStatusEffect } from "#lib/view-model-component/status/effects/StopStatusEffect.ts"
import { StatusCondition } from "#lib/view-model-component/status/conditions/StatusCondition.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { ATypeHitRate } from "./ATypeHitRate.ts"
import { FullTypeHitRate } from "./FullTypeHitRate.ts"
import { HitRate } from "./HitRate.ts"
import { STypeHitRate } from "./STypeHitRate.ts"

const { EVD, RES } = StatTypes

/**
 * A 5×5 board with a defender in the middle, (2, 2), facing north (+y), with 50 evade and 50
 * resistance, and an attacker at `from`.
 */
function setup(from: Point) {
	const notifications = new NotificationCenter()
	const random = new Random(1)
	const b = board("00000", "00000", "00000", "00000", "00000")
	const unit = (name: string, p: Point) => {
		const u = new Unit({ name, model: "Hero", notifications })
		u.place(b.getTile(p))
		u.stats.set(EVD, 50)
		u.stats.set(RES, 50)
		return u
	}
	const defender = unit("Defender", Point.of(2, 2))
	defender.dir = Directions.North
	const attacker = unit("Attacker", from)
	const context = { notifications, random }
	const target = defender.tile!
	return { notifications, random, attacker, defender, target, context }
}

/** Lets Unity's end of frame pass: removed status effects are disabled by then. */
const endOfFrame = () => new Promise<void>((resolve) => queueMicrotask(resolve))

const front = Point.of(2, 4)
const side = Point.of(0, 2)
const back = Point.of(2, 0)

describe("getFacing", () => {
	test.each([
		[front, Facings.Front],
		[Point.of(3, 4), Facings.Front],
		[Point.of(4, 3), Facings.Side],
		[side, Facings.Side],
		[Point.of(4, 1), Facings.Side],
		[Point.of(3, 0), Facings.Back],
		[back, Facings.Back],
		// Attacking yourself (the approach has no direction).
		[Point.of(2, 2), Facings.Side]
	])("from %s, an attack on a unit facing north is from its %i", (from, facing) => {
		const { attacker, defender } = setup(from)
		expect(getFacing(attacker, defender)).toBe(facing)
	})
})

describe("ATypeHitRate", () => {
	test.each([
		[front, 50],
		[side, 75],
		[back, 88]
	])("from %s, evade counts in full, half, a quarter", (from, chance) => {
		const { attacker, target, context } = setup(from)
		expect(new ATypeHitRate(attacker, context).calculate(target)).toBe(chance)
	})

	test("evade is clamped to 5–95", () => {
		const { attacker, defender, target, context } = setup(front)
		const hitRate = new ATypeHitRate(attacker, context)
		defender.stats.set(EVD, 0)
		expect(hitRate.calculate(target)).toBe(95)
		defender.stats.set(EVD, 200)
		expect(hitRate.calculate(target)).toBe(5)
	})

	test("a blind attacker misses more; a blind defender is hit more", async () => {
		const { attacker, defender, target, context } = setup(front)
		const hitRate = new ATypeHitRate(attacker, context)
		const blind = attacker.status.add(BlindStatusEffect, StatusCondition)
		expect(hitRate.calculate(target)).toBe(5)
		blind.remove()
		await endOfFrame()
		defender.status.add(BlindStatusEffect, StatusCondition)
		expect(hitRate.calculate(target)).toBe(70)
	})

	test("a stopped defender is always hit, from the front too", () => {
		const { attacker, defender, target, context } = setup(front)
		defender.status.add(StopStatusEffect, StatusCondition)
		expect(new ATypeHitRate(attacker, context).calculate(target)).toBe(100)
	})

	test("an automatic miss, unless it's also an automatic hit", () => {
		const { notifications, attacker, target, context } = setup(front)
		const hitRate = new ATypeHitRate(attacker, context)
		const miss = vi.fn((sender: HitRate, exc: MatchException) => {
			expect([sender, exc.attacker, exc.target]).toEqual([hitRate, attacker, target.content])
			exc.flipToggle()
		})
		notifications.addObserver(miss, HitRate.automaticMissCheckNotification)
		expect(hitRate.calculate(target)).toBe(0)
		expect(miss).toHaveBeenCalledOnce()

		target.content!.status.add(StopStatusEffect, StatusCondition)
		expect(hitRate.calculate(target)).toBe(100)
	})
})

describe("STypeHitRate", () => {
	test.each([
		[front, 50],
		[side, 60],
		[back, 70]
	])("from %s, resistance counts in full, 10 less, 20 less", (from, chance) => {
		const { attacker, target, context } = setup(from)
		expect(new STypeHitRate(attacker, context).calculate(target)).toBe(chance)
	})

	test("blindness changes resistance before the facing does; then it's clamped to 0–100", () => {
		const { attacker, defender, target, context } = setup(back)
		const hitRate = new STypeHitRate(attacker, context)
		defender.stats.set(RES, 10)
		defender.status.add(BlindStatusEffect, StatusCondition)
		expect(hitRate.calculate(target)).toBe(100)
		attacker.status.add(BlindStatusEffect, StatusCondition)
		expect(hitRate.calculate(target)).toBe(80)
	})

	test("an automatic miss wins over an automatic hit", () => {
		const { notifications, attacker, defender, target, context } = setup(front)
		defender.status.add(StopStatusEffect, StatusCondition)
		const hitRate = new STypeHitRate(attacker, context)
		expect(hitRate.calculate(target)).toBe(100)
		notifications.addObserver((_, exc) => exc.flipToggle(), HitRate.automaticMissCheckNotification)
		expect(hitRate.calculate(target)).toBe(0)
	})
})

describe("FullTypeHitRate", () => {
	test("always hits, unless something makes it miss; the angle doesn't matter", () => {
		const { notifications, attacker, target, context } = setup(front)
		const hitRate = new FullTypeHitRate(attacker, context)
		expect(hitRate.isAngleBased).toBe(false)
		expect(new ATypeHitRate(attacker, context).isAngleBased).toBe(true)
		expect(hitRate.calculate(target)).toBe(100)
		notifications.addObserver((_, exc) => exc.flipToggle(), HitRate.automaticMissCheckNotification)
		expect(hitRate.calculate(target)).toBe(0)
	})
})

describe("rollForHit", () => {
	test("hits when a roll of 0–100 is at most the chance", () => {
		const { attacker, target, context, random } = setup(side)
		const hitRate = new ATypeHitRate(attacker, context)
		const roll = vi.spyOn(random, "int").mockReturnValue(75)
		expect(hitRate.rollForHit(target)).toBe(true)
		expect(roll).toHaveBeenCalledWith(0, 101)
		roll.mockReturnValue(76)
		expect(hitRate.rollForHit(target)).toBe(false)
	})
})
