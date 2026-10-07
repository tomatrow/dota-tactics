import { describe, expect, expectTypeOf, test, vi } from "vitest"
import {
	NotificationCenter,
	type Handler
} from "#lib/common/notification-center/NotificationCenter.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { AddValueModifier } from "#lib/exceptions/modifiers/AddValueModifier.ts"
import { MultValueModifier } from "#lib/exceptions/modifiers/MultValueModifier.ts"
import type { ValueChangeException } from "#lib/exceptions/ValueChangeException.ts"
import { Stats } from "./Stats.ts"

describe("Stats", () => {
	test("names its notifications per stat", () => {
		expect(Stats.willChangeNotification(StatTypes.HP)).toBe("Stats.HPWillChange")
		expect(Stats.didChangeNotification(StatTypes.CTR)).toBe("Stats.CTRDidChange")
		expectTypeOf(Stats.didChangeNotification(StatTypes.MOV)).toEqualTypeOf<"Stats.MOVDidChange">()
		expectTypeOf<Handler<"Stats.ATKWillChange">>().toEqualTypeOf<
			(sender: Stats, exc: ValueChangeException) => void
		>()
	})

	test("starts at zero", () => {
		const stats = new Stats(new NotificationCenter())
		expect(
			Object.values(StatTypes)
				.slice(0, -1)
				.map((t) => stats.get(t as StatTypes))
		).toEqual(new Array(16).fill(0))
	})

	test("setting a stat posts a will-change exception, then a did-change with the old value", () => {
		const center = new NotificationCenter()
		const stats = new Stats(center)
		const calls: unknown[] = []
		center.addObserver(
			(sender, exc) => calls.push(["will", sender, exc.fromValue, exc.toValue]),
			Stats.willChangeNotification(StatTypes.HP),
			stats
		)
		center.addObserver(
			(sender, oldValue) => calls.push(["did", sender, oldValue, stats.get(StatTypes.HP)]),
			Stats.didChangeNotification(StatTypes.HP),
			stats
		)

		stats.set(StatTypes.HP, 10)
		stats.set(StatTypes.HP, 10)
		stats.setValue(StatTypes.HP, 20, false)
		expect(calls).toEqual([
			["will", stats, 0, 10],
			["did", stats, 0, 10],
			["did", stats, 10, 20]
		])
	})

	test("listeners can modify the new value; it's floored", () => {
		const center = new NotificationCenter()
		const stats = new Stats(center)
		center.addObserver((_sender, exc) => {
			exc.addModifier(new MultValueModifier(0, 1.5))
			exc.addModifier(new AddValueModifier(1, 0.9))
		}, Stats.willChangeNotification(StatTypes.ATK))
		stats.set(StatTypes.ATK, 5)
		expect(stats.get(StatTypes.ATK)).toBe(8)
	})

	test("listeners can block a change, or modify it away", () => {
		const center = new NotificationCenter()
		const stats = new Stats(center)
		const didChange = vi.fn()
		center.addObserver(didChange, Stats.didChangeNotification(StatTypes.DEF))
		const block: Handler<"Stats.DEFWillChange"> = (_sender, exc) => exc.flipToggle()
		center.addObserver(block, Stats.willChangeNotification(StatTypes.DEF))
		stats.set(StatTypes.DEF, 5)
		center.removeObserver(block, Stats.willChangeNotification(StatTypes.DEF))

		center.addObserver(
			(_sender, exc) => exc.addModifier(new MultValueModifier(0, 0)),
			Stats.willChangeNotification(StatTypes.DEF)
		)
		stats.set(StatTypes.DEF, 5)
		expect(stats.get(StatTypes.DEF)).toBe(0)
		expect(didChange).not.toHaveBeenCalled()
	})
})
