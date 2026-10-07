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
