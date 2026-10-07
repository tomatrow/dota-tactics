import { beforeEach, describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/unity/Random.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { advance, useFakeTime } from "#lib/testing/time.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { StatPanelController } from "./StatPanelController.svelte.ts"

beforeEach(useFakeTime)

function unit() {
	const u = new Unit({ name: "Arthur", model: "Hero", notifications: new NotificationCenter() })
	const { stats } = u
	stats.set(StatTypes.LVL, 7)
	stats.set(StatTypes.MHP, 90)
	stats.set(StatTypes.HP, 42)
	stats.set(StatTypes.MMP, 22)
	stats.set(StatTypes.MP, 20)
	return u
}

describe("StatPanelController", () => {
	test("both panels start hidden", () => {
		const controller = new StatPanelController(new Random(1))
		expect(controller.primaryPanel.panel.currentPosition?.name).toBe("Hide")
		expect(controller.secondaryPanel.panel.currentPosition?.name).toBe("Hide")
		// Off screen: the primary panel's right edge on the left edge, and vice versa.
		expect(controller.primaryPanel.panel.anchor.placement).toEqual([0, 0, 1, 0, 0, 20])
		expect(controller.secondaryPanel.panel.anchor.placement).toEqual([1, 0, 0, 0, 0, 20])
	})

	test("showing displays the unit's stats as they are, and slides the panel in", async () => {
		const controller = new StatPanelController(new Random(1))
		const u = unit()
		controller.showPrimary(u)
		const { primaryPanel: panel } = controller
		expect([panel.nameLabel, panel.hpLabel, panel.mpLabel, panel.lvLabel]).toEqual([
			"Arthur",
			"HP 42 / 90",
			"MP 20 / 22",
			"LV. 7"
		])
		expect(panel.panel.currentPosition?.name).toBe("Show")
		await advance(0.25)
		expect(panel.panel.anchor.placement[2]).toBeGreaterThan(0)
		expect(panel.panel.anchor.placement[2]).toBeLessThan(0.5)
		await advance(0.3)
		expect(panel.panel.anchor.placement).toEqual([0, 0, 0, 0, 0, 20])

		// A snapshot: the labels change only when shown again.
		u.stats.set(StatTypes.HP, 1)
		expect(panel.hpLabel).toBe("HP 42 / 90")
	})

	test("the secondary panel slides in from the right, and both slide out", async () => {
		const controller = new StatPanelController(new Random(1))
		controller.showSecondary(unit())
		await advance(0.6)
		expect(controller.secondaryPanel.panel.anchor.placement).toEqual([1, 0, 1, 0, 0, 20])
		controller.hideSecondary()
		controller.hidePrimary()
		await advance(0.6)
		expect(controller.secondaryPanel.panel.anchor.placement).toEqual([1, 0, 0, 0, 0, 20])
		expect(controller.primaryPanel.panel.anchor.placement).toEqual([0, 0, 1, 0, 0, 20])
	})

	test("hiding then showing at once keeps a shown panel in place", async () => {
		const controller = new StatPanelController(new Random(1))
		controller.showPrimary(unit())
		await advance(0.6)
		controller.hidePrimary()
		controller.showPrimary(unit())
		await advance(0.1)
		expect(controller.primaryPanel.panel.anchor.placement).toEqual([0, 0, 0, 0, 0, 20])
	})

	test("the background is randomly blue or red until units have alliances", () => {
		const controller = new StatPanelController(new Random(3))
		const backgrounds = new Set<string>()
		for (let i = 0; i < 20; ++i) {
			controller.showPrimary(unit())
			backgrounds.add(controller.primaryPanel.background)
		}
		expect([...backgrounds].sort()).toEqual(["BlueAttackPanel", "RedAttackPanel"])
	})
})
