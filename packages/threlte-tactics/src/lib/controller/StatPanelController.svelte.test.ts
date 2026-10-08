import { beforeEach, describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Alliances } from "#lib/enums/Alliances.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { advance, useFakeTime } from "#lib/testing/time.ts"
import { Alliance } from "#lib/view-model-component/actor/Alliance.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { StatPanelController } from "./StatPanelController.svelte.ts"

beforeEach(useFakeTime)

function unit(alliance: Alliances = Alliances.Hero) {
	const u = new Unit({ name: "Arthur", model: "Hero", notifications: new NotificationCenter() })
	u.alliance = new Alliance(alliance)
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
		const controller = new StatPanelController()
		expect(controller.primaryPanel.panel.currentPosition?.name).toBe("Hide")
		expect(controller.secondaryPanel.panel.currentPosition?.name).toBe("Hide")
		// Off screen: the primary panel's right edge on the left edge, and vice versa.
		expect(controller.primaryPanel.panel.anchor.placement).toEqual([0, 0, 1, 0, 0, 20])
		expect(controller.secondaryPanel.panel.anchor.placement).toEqual([1, 0, 0, 0, 0, 20])
	})

	test("showing displays the unit's stats as they are, and slides the panel in", async () => {
		const controller = new StatPanelController()
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
		const controller = new StatPanelController()
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
		const controller = new StatPanelController()
		controller.showPrimary(unit())
		await advance(0.6)
		controller.hidePrimary()
		controller.showPrimary(unit())
		await advance(0.1)
		expect(controller.primaryPanel.panel.anchor.placement).toEqual([0, 0, 0, 0, 0, 20])
	})

	test("the background is red for an enemy, blue for anyone else", () => {
		const controller = new StatPanelController()
		const { Hero, Enemy, Neutral } = Alliances
		const backgrounds = [Hero, Enemy, Neutral].map((alliance) => {
			controller.showPrimary(unit(alliance))
			return controller.primaryPanel.background
		})
		expect(backgrounds).toEqual(["BlueAttackPanel", "RedAttackPanel", "BlueAttackPanel"])
	})
})
