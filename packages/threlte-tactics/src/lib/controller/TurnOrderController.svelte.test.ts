import { describe, expect, test } from "vitest"
import {
	NotificationCenter,
	type NotificationName
} from "#lib/common/notification-center/NotificationCenter.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { BaseException } from "#lib/exceptions/BaseException.ts"
import type { ValueChangeException } from "#lib/exceptions/ValueChangeException.ts"
import { Turn } from "#lib/model/Turn.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { TurnOrderController } from "./TurnOrderController.ts"

const { CTR, SPD } = StatTypes

/** Units with these speeds (and no counter yet), and a turn order over them. */
function setup(...speeds: number[]) {
	const notifications = new NotificationCenter()
	const units = speeds.map((speed, i) => {
		const unit = new Unit({ name: `Unit ${i}`, model: "Hero", notifications })
		unit.stats.set(SPD, speed)
		return unit
	})
	const owner = { notifications, turn: new Turn(), units }
	const round = new TurnOrderController(owner).round()
	const counters = () => units.map((u) => u.stats.get(CTR))
	const next = () => round.next().value.name
	return { notifications, units, turn: owner.turn, round, counters, next }
}

describe("TurnOrderController", () => {
	test("counters grow by speed each round; at 1000 a unit takes a turn, which costs 500", () => {
		const { units, turn, counters, next } = setup(100, 250, 200)

		// Round 4: 400, 1000, 800.
		expect(next()).toBe("Unit 1")
		expect(turn.actor).toBe(units[1])
		expect(counters()).toEqual([400, 1000, 800])

		// Round 5: 500, 750, 1000.
		expect(next()).toBe("Unit 2")
		expect(counters()).toEqual([500, 750, 1000])
		// Round 6: 600, 1000, 700.
		expect(next()).toBe("Unit 1")
		expect(counters()).toEqual([600, 1000, 700])
	})

	test("moving costs 300 more, acting 200 more", () => {
		const { turn, counters, next } = setup(100, 250, 200)
		next()
		turn.hasUnitMoved = true
		next()
		expect(counters()).toEqual([500, 200 + 250, 1000])
		turn.hasUnitActed = true
		// Unit 2 is down to 1000 - 700; three rounds later Unit 1 is over 1000 again.
		expect(next()).toBe("Unit 1")
		expect(counters()).toEqual([800, 450 + 3 * 250, 300 + 3 * 200])
	})

	test("the highest counter goes first; others over 1000 follow in the same round", () => {
		const { turn, counters, next } = setup(500, 600, 400)
		// Round 2: 1000, 1200, 800.
		expect(next()).toBe("Unit 1")
		turn.hasUnitMoved = turn.hasUnitActed = true
		expect(next()).toBe("Unit 0")
		expect(counters()).toEqual([1000, 200, 800])
		// Round 3: 1000 (after 500), 800, 1200.
		expect(next()).toBe("Unit 2")
		expect(counters()).toEqual([1000, 800, 1200])
		expect(next()).toBe("Unit 0")
	})

	test("units with equal counters go in reverse order of the battle's units", () => {
		const { next } = setup(500, 500)
		expect([next(), next()]).toEqual(["Unit 1", "Unit 0"])
	})

	test("posts the rounds and turns", () => {
		const { notifications, next } = setup(500, 400)
		const log: string[] = []
		const names: NotificationName[] = [
			TurnOrderController.roundBeganNotification,
			TurnOrderController.turnCheckNotification,
			TurnOrderController.turnBeganNotification,
			TurnOrderController.turnCompletedNotification,
			TurnOrderController.roundEndedNotification
		]
		for (const name of names) {
			notifications.addObserver((sender: unknown, _args?: unknown) => {
				const who = sender instanceof Unit ? ` ${sender.name}` : ""
				log.push(`${name.replace("TurnOrderController.", "")}${who}`)
			}, name)
		}

		next()
		expect(log).toEqual([
			"roundBegan",
			"turnCheck Unit 0",
			"turnCheck Unit 1",
			"roundEnded",
			"roundBegan",
			"turnCheck Unit 0",
			"TurnBeganNotification Unit 0"
		])
		log.length = 0
		next()
		expect(log).toEqual([
			"turnCompleted Unit 0",
			"turnCheck Unit 1",
			"roundEnded",
			"roundBegan",
			"turnCheck Unit 1",
			"TurnBeganNotification Unit 1"
		])
	})

	test("the turn check can be overruled", () => {
		const { notifications, units, next } = setup(500, 100)
		// Unit 0 can't act; Unit 1 can once its counter is at least 300.
		notifications.addObserver((sender: Unit, exc: BaseException) => {
			if (sender === units[0] ? exc.toggle : sender.stats.get(CTR) >= 300) exc.flipToggle()
		}, TurnOrderController.turnCheckNotification)

		expect(next()).toBe("Unit 1")
		expect(units.map((u) => u.stats.get(CTR))).toEqual([1500, 300])
	})

	test("counters grow through the stats' exceptions; turn costs bypass them", () => {
		const { notifications, counters, next } = setup(500)
		const changes: number[] = []
		notifications.addObserver((_stats: unknown, exc: ValueChangeException) => {
			changes.push(exc.toValue)
		}, "Stats.CTRWillChange")

		next()
		next()
		expect(changes).toEqual([500, 1000, 1000])
		expect(counters()).toEqual([1000])
	})
})
