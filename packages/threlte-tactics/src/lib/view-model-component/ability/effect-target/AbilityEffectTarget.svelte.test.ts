import { expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Point } from "#lib/model/Point.ts"
import { board } from "#lib/testing/board.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { DefaultAbilityEffectTarget } from "./DefaultAbilityEffectTarget.ts"
import { KOdAbilityEffectTarget } from "./KOdAbilityEffectTarget.ts"

test("Default targets units with hit points left; KO'd those without", () => {
	const b = board("111")
	const notifications = new NotificationCenter()
	const [standing, down] = [0, 1].map((x) => {
		const unit = new Unit({ name: "Hero", model: "Hero", notifications })
		unit.place(b.getTile(Point.of(x, 0)))
		return unit
	}) as [Unit, Unit]
	standing.stats.set(StatTypes.HP, 1)
	down.stats.set(StatTypes.HP, 0)

	const tiles = [standing.tile, down.tile, b.getTile(Point.of(2, 0)), null]
	expect(tiles.map((t) => new DefaultAbilityEffectTarget().isTarget(t))).toEqual([
		true,
		false,
		false,
		false
	])
	expect(tiles.map((t) => new KOdAbilityEffectTarget().isTarget(t))).toEqual([
		false,
		true,
		false,
		false
	])
})
