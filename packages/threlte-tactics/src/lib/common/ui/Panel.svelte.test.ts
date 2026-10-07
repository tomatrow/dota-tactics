import { quadOut } from "svelte/easing"
import { describe, expect, test } from "vitest"
import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
import { LayoutAnchor } from "./LayoutAnchor.svelte.ts"
import { Panel, type PanelPosition } from "./Panel.ts"

const show: PanelPosition = {
	name: "Show",
	myAnchor: TextAnchor.LowerLeft,
	parentAnchor: TextAnchor.LowerLeft,
	offset: [10, 10]
}
const hide: PanelPosition = {
	name: "Hide",
	myAnchor: TextAnchor.UpperRight,
	parentAnchor: TextAnchor.LowerLeft,
	offset: [0, -5]
}

const placementOf = (p: PanelPosition) =>
	new LayoutAnchor().anchorPosition(p.myAnchor, p.parentAnchor, p.offset)

const timeout = (ms: number) =>
	new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ms))

describe("LayoutAnchor", () => {
	test("anchor points are fractions of the rect from its lower-left corner", () => {
		const anchor = new LayoutAnchor()
		expect(anchor.anchorPosition(TextAnchor.UpperRight, TextAnchor.MiddleCenter, [5, -3])).toEqual([
			0.5, 0.5, 1, 1, 5, -3
		])
		expect(anchor.anchorPosition(TextAnchor.LowerCenter, TextAnchor.MiddleLeft, [0, 0])).toEqual([
			0, 0.5, 0.5, 0, 0, 0
		])
	})
})

describe("Panel", () => {
	test("starts at the first position; the first of duplicate names wins", () => {
		const panel = new Panel([hide, show, { ...show, offset: [99, 99] }])
		expect(panel.currentPosition).toBe(hide)
		expect(panel.anchor.placement).toEqual(placementOf(hide))
		expect(panel.get("Show")).toBe(show)
		expect(panel.get("Nope")).toBeNull()
	})

	test("snaps by name or position", () => {
		const panel = new Panel([hide, show])
		expect(panel.setPosition("Show", false)).toBeNull()
		expect(panel.currentPosition).toBe(show)
		expect(panel.anchor.placement).toEqual(placementOf(show))
	})

	test("an unknown position clears the current one and leaves the panel in place", () => {
		const panel = new Panel([hide, show])
		expect(panel.setPosition("Nope", true)).toBeNull()
		expect(panel.currentPosition).toBeNull()
		expect(panel.anchor.placement).toEqual(placementOf(hide))
	})

	test("tweens to a position and resolves on completion", async () => {
		const panel = new Panel([hide, show])
		const started = performance.now()
		const transition = panel.setPosition(show, true, { duration: 0.1, equation: quadOut })
		expect(panel.inTransition).toBe(true)
		await transition
		expect(performance.now() - started).toBeGreaterThanOrEqual(95)
		expect(panel.anchor.placement).toEqual(placementOf(show))
		expect(panel.inTransition).toBe(false)
	})

	test("an interrupted tween never completes", async () => {
		const panel = new Panel([hide, show])
		const first = panel.setPosition(show, true, { duration: 0.2 })
		await panel.setPosition(hide, true, { duration: 0.05 })
		expect(await Promise.race([first, timeout(300)])).toBe("timeout")
		expect(panel.anchor.placement).toEqual(placementOf(hide))
	})

	test("snapping stops a tween in the same tick", async () => {
		const panel = new Panel([hide, show])
		void panel.setPosition(show, true, { duration: 0.05 })
		panel.setPosition(hide, false)
		expect(panel.inTransition).toBe(false)
		await timeout(100)
		expect(panel.anchor.placement).toEqual(placementOf(hide))
	})
})
