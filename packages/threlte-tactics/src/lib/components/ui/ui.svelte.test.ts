import { expect, test } from "vitest"
import { render } from "vitest-browser-svelte"
import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
import UIImage from "./UIImage.svelte"
import UIText from "./UIText.svelte"

function box(width: number, height: number): HTMLElement {
	const parent = document.createElement("div")
	Object.assign(parent.style, { position: "relative", width: `${width}px`, height: `${height}px` })
	document.body.append(parent)
	return parent
}

test("UIText's best fit picks the largest size that fits, again when the text changes", async () => {
	const short = "Hi"
	const long = "A message long enough that it can't possibly fit at thirty pixels in this box."
	const screen = await render(
		UIText,
		{ props: { text: short, bestFit: [20, 30], alignment: TextAnchor.MiddleCenter } },
		{ baseElement: box(284, 120) }
	)
	const element = screen.container.querySelector("div")!
	expect(element.style.fontSize).toBe("30px")

	await screen.rerender({ text: long })
	const size = parseFloat(element.style.fontSize)
	expect(size).toBeLessThan(30)
	expect(size).toBeGreaterThanOrEqual(20)
	expect(element.scrollHeight).toBeLessThanOrEqual(element.clientHeight)

	await screen.rerender({ text: short })
	expect(element.style.fontSize).toBe("30px")
})

test("a sliced UIImage draws its sprite's 9 slices, edges unscaled", async () => {
	const screen = await render(
		UIImage,
		{ props: { sprite: "ConversationPanel", type: "Sliced" } },
		{ baseElement: box(465, 140) }
	)
	const canvas = screen.container.querySelector("canvas")!
	// Drawn once the sprite loads.
	await expect.poll(() => canvas.getContext("2d")!.getImageData(200, 70, 1, 1).data[3]).toBe(255)
	const k = canvas.width / 465
	const alpha = (x: number, y: number) =>
		canvas.getContext("2d")!.getImageData(Math.floor(x * k), Math.floor(y * k), 1, 1).data[3]
	// The rounded left cap (71 px) stays round; the transparent corner is still there.
	expect(alpha(1, 1)).toBe(0)
	expect(alpha(70, 70)).toBe(255)
	// The middle stretches all the way to the right edge.
	expect(alpha(463, 70)).toBe(255)
})

test("a sliced UIImage stretches a center with no sprite pixels (BlueAttackPanel)", async () => {
	const screen = await render(
		UIImage,
		{ props: { sprite: "BlueAttackPanel", type: "Sliced" } },
		{ baseElement: box(319, 100) }
	)
	const canvas = screen.container.querySelector("canvas")!
	const k = canvas.width / 319
	const pixel = (x: number, y: number) => [
		...canvas.getContext("2d")!.getImageData(Math.floor(x * k), Math.floor(y * k), 1, 1).data
	]
	await expect.poll(() => pixel(150, 50)).toEqual([21, 77, 125, 255])
})

test("UIText draws a uGUI Shadow below and to the right", async () => {
	const screen = await render(
		UIText,
		{ props: { text: "HP 1 / 2", shadow: ["rgb(0 0 0 / 0.5)", [1, -1]] } },
		{ baseElement: box(100, 30) }
	)
	expect(screen.container.querySelector("div")!.style.textShadow).toBe(
		"rgba(0, 0, 0, 0.5) 1px 1px 0px"
	)
})

test("UIText's font styles", async () => {
	const screen = await render(
		UIText,
		{ props: { text: "88% 12pt(s)", fontStyle: "BoldAndItalic" } },
		{ baseElement: box(192, 36) }
	)
	const { style } = screen.container.querySelector("div")!
	expect([style.fontWeight, style.fontStyle]).toEqual(["bold", "italic"])

	await screen.rerender({ fontStyle: "Normal" })
	expect([style.fontWeight, style.fontStyle]).toEqual(["", ""])
})

test("a filled UIImage shows the left part of its sprite", async () => {
	const screen = await render(
		UIImage,
		{ props: { sprite: "AttackArrowFill", type: "Filled", fillAmount: 0.75 } },
		{ baseElement: box(160, 49) }
	)
	const image = screen.container.querySelector("img")!
	expect(image.style.clipPath).toBe("inset(0px 25% 0px 0px)")

	await screen.rerender({ fillAmount: 1 })
	expect(image.style.clipPath).toBe("inset(0px 0% 0px 0px)")
})
