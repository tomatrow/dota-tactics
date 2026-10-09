import { describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Alliances } from "#lib/enums/Alliances.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Alliance } from "#lib/view-model-component/actor/Alliance.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { StatPanelController } from "./StatPanelController.svelte.ts"

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
		expect([controller.primaryPanel.shown, controller.secondaryPanel.shown]).toEqual([false, false])
	})

	test("showing displays the unit's stats as they are, and shows the panel", () => {
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
		expect(panel.shown).toBe(true)

		// A snapshot: the labels change only when shown again.
		u.stats.set(StatTypes.HP, 1)
		expect(panel.hpLabel).toBe("HP 42 / 90")
	})

	test("each panel shows and hides on its own", () => {
		const controller = new StatPanelController()
		controller.showSecondary(unit())
		expect([controller.primaryPanel.shown, controller.secondaryPanel.shown]).toEqual([false, true])
		controller.hideSecondary()
		controller.hidePrimary()
		expect([controller.primaryPanel.shown, controller.secondaryPanel.shown]).toEqual([false, false])
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
