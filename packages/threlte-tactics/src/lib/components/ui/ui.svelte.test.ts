import { createRawSnippet } from "svelte"
import { expect, test } from "vitest"
import { render } from "vitest-browser-svelte"
import { fitText } from "./fitText.ts"
import SlicedImage from "./SlicedImage.svelte"
import UICanvas from "./UICanvas.svelte"

function box(width: number, height: number): HTMLElement {
	const parent = document.createElement("div")
	Object.assign(parent.style, { position: "relative", width: `${width}px`, height: `${height}px` })
	document.body.append(parent)
	return parent
}

test("fitText picks the largest size that fits, again when the text changes", () => {
	const element = box(284, 120)
	const span = document.createElement("span")
	element.append(span)
	const fit = (text: string) => {
		span.textContent = text
		fitText(text, [20, 30])(element)
		return parseFloat(element.style.fontSize)
	}

	expect(fit("Hi")).toBe(30)
	const size = fit("A message long enough that it can't possibly fit at thirty pixels in this box.")
	expect(size).toBeLessThan(30)
	expect(size).toBeGreaterThanOrEqual(20)
	expect(span.offsetHeight).toBeLessThanOrEqual(element.clientHeight)
	expect(fit("Hi")).toBe(30)
})

test("a sliced image draws its sprite's 9 slices, edges unscaled", async () => {
	const screen = await render(
		SlicedImage,
		{ props: { sprite: "ConversationPanel" } },
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

test("a sliced image stretches a center with no sprite pixels (BlueAttackPanel)", async () => {
	const screen = await render(
		SlicedImage,
		{ props: { sprite: "BlueAttackPanel" } },
		{ baseElement: box(319, 100) }
	)
	const canvas = screen.container.querySelector("canvas")!
	const k = canvas.width / 319
	const pixel = (x: number, y: number) => [
		...canvas.getContext("2d")!.getImageData(Math.floor(x * k), Math.floor(y * k), 1, 1).data
	]
	await expect.poll(() => pixel(150, 50)).toEqual([21, 77, 125, 255])
})

test("a UI canvas lays its content out on a 480-pixel-tall stage, zoomed to the screen", async () => {
	const screen = await render(
		UICanvas,
		{
			props: {
				name: "Test",
				children: createRawSnippet(() => ({ render: () => `<p>Hello</p>` }))
			}
		},
		{ baseElement: box(1280, 960) }
	)
	const region = screen.getByRole("region", { name: "Test" })
	await expect.element(region).toHaveTextContent("Hello")
	const stage = region.element().firstElementChild as HTMLElement
	expect(stage.style.zoom).toBe("2")
	expect(stage.style.width).toBe("640px")
})
