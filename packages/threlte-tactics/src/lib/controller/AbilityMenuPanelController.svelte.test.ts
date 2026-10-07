import { beforeEach, describe, expect, test } from "vitest"
import { advance, useFakeTime } from "#lib/testing/time.ts"
import { AbilityMenuPanelController } from "./AbilityMenuPanelController.svelte.ts"

beforeEach(useFakeTime)

const selected = (controller: AbilityMenuPanelController) =>
	controller.menuEntries[controller.selection]?.title

describe("AbilityMenuPanelController", () => {
	test("starts hidden", () => {
		const controller = new AbilityMenuPanelController()
		expect(controller.canvasActive).toBe(false)
		expect(controller.panel.currentPosition?.name).toBe("Hide")
	})

	test("shows a titled menu with the first entry selected", () => {
		const controller = new AbilityMenuPanelController()
		controller.show("Commands", ["Move", "Action", "Wait"])

		expect(controller.canvasActive).toBe(true)
		expect(controller.panel.currentPosition?.name).toBe("Show")
		expect(controller.title).toBe("Commands")
		expect(controller.menuEntries.map((e) => [e.title, e.isSelected])).toEqual([
			["Move", true],
			["Action", false],
			["Wait", false]
		])
	})

	test("next and previous wrap around and skip locked entries", () => {
		const controller = new AbilityMenuPanelController()
		controller.show("Commands", ["A", "B", "C", "D"])
		controller.setLocked(1, true)
		controller.setLocked(2, true)

		controller.next()
		expect(selected(controller)).toBe("D")
		controller.next()
		expect(selected(controller)).toBe("A")
		controller.previous()
		expect(selected(controller)).toBe("D")
		expect(controller.menuEntries.filter((e) => e.isSelected)).toHaveLength(1)
	})

	test("locking the selected entry selects the next one", () => {
		const controller = new AbilityMenuPanelController()
		controller.show("Commands", ["Move", "Action", "Wait"])
		controller.setLocked(0, true)
		expect(selected(controller)).toBe("Action")
		controller.setLocked(1, true)
		expect(selected(controller)).toBe("Wait")
		controller.setLocked(7, true)
	})

	test("entries look normal, selected or locked", () => {
		const controller = new AbilityMenuPanelController()
		controller.show("Commands", ["Move", "Action"])
		const [move, action] = controller.menuEntries
		// An entry that never changed keeps the prefab's half-transparent outline.
		expect([action!.bullet, action!.labelColor, action!.outlineColor]).toEqual([
			"MenuBullet",
			"rgb(255 255 255)",
			"rgb(20 36 44 / 0.5)"
		])
		expect([move!.bullet, move!.labelColor, move!.outlineColor]).toEqual([
			"MenuBulletSelected",
			"rgb(249 210 118)",
			"rgb(255 160 72)"
		])
		controller.setLocked(0, true)
		expect([move!.bullet, move!.labelColor, move!.outlineColor]).toEqual([
			"MenuBulletLocked",
			"rgb(128 128 128)",
			"rgb(20 36 44)"
		])
	})

	test("hiding clears the menu and deactivates the canvas once the panel is out", async () => {
		const controller = new AbilityMenuPanelController()
		controller.show("Commands", ["Move"])
		await advance(0.6)
		controller.hide()
		await advance(0.4)
		expect(controller.menuEntries).toHaveLength(1)
		await advance(0.2)
		expect(controller.menuEntries).toHaveLength(0)
		expect(controller.canvasActive).toBe(false)
	})

	test("showing again while hiding keeps the new menu", async () => {
		const controller = new AbilityMenuPanelController()
		controller.show("Commands", ["Move"])
		controller.hide()
		controller.show("Action", ["Attack"])
		await advance(1)
		expect(controller.canvasActive).toBe(true)
		expect(controller.menuEntries.map((e) => e.title)).toEqual(["Attack"])
		expect(controller.panel.currentPosition?.name).toBe("Show")
	})
})
