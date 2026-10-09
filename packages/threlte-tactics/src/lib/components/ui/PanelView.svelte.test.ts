import { createRawSnippet, flushSync } from "svelte"
import { afterEach, expect, test } from "vitest"
import { render } from "vitest-browser-svelte"
import { Panel, type PanelPosition } from "#lib/common/ui/Panel.ts"
import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
import type { Vector2 } from "#lib/common/vector.ts"
import PanelView from "./PanelView.svelte"
import UICanvas from "./UICanvas.svelte"

const parentSize: Vector2 = [640, 480]
const mySize: Vector2 = [100, 50]

/** Unity's `LayoutAnchor.GetPosition`, transcribed. */
function unityGetPosition([width, height]: Vector2, anchor: TextAnchor): Vector2 {
	const ret: Vector2 = [0, 0]
	if ([7, 4, 1].includes(anchor)) ret[0] += width * 0.5
	if ([8, 5, 2].includes(anchor)) ret[0] += width
	if ([3, 4, 5].includes(anchor)) ret[1] += height * 0.5
	if ([0, 1, 2].includes(anchor)) ret[1] += height
	return ret
}

/**
 * Where Unity puts the rect's lower-left corner (parent space, y up): `LayoutAnchor.AnchorPosition`
 * gives the `anchoredPosition`, which a RectTransform with the given anchor and pivot applies.
 */
function unityLowerLeft(position: PanelPosition, anchor: Vector2, pivot: Vector2): Vector2 {
	const myOffset = unityGetPosition(mySize, position.myAnchor)
	const parentOffset = unityGetPosition(parentSize, position.parentAnchor)
	const result: Vector2 = [0, 0]
	for (const i of [0, 1]) {
		const myAnchorOffset = parentSize[i] * anchor[i]
		const myPivotOffset = mySize[i] * pivot[i]
		const anchoredPosition = Math.round(
			parentOffset[i] - myAnchorOffset - myOffset[i] + myPivotOffset + position.offset[i]
		)
		result[i] = myAnchorOffset + anchoredPosition - myPivotOffset
	}
	return result
}

let parent: HTMLDivElement

afterEach(() => parent.remove())

async function renderPanel(panel: Panel) {
	parent = document.createElement("div")
	Object.assign(parent.style, {
		position: "relative",
		width: `${parentSize[0]}px`,
		height: `${parentSize[1]}px`
	})
	document.body.append(parent)
	const screen = await render(
		PanelView,
		{ props: { panel, width: mySize[0], height: mySize[1] } },
		{ baseElement: parent }
	)
	return screen.container.firstElementChild as HTMLElement
}

test("places the panel where Unity's LayoutAnchor would", async () => {
	const panel = new Panel([])
	const element = await renderPanel(panel)

	for (let myAnchor = 0; myAnchor < 9; ++myAnchor)
		for (const parentAnchor of [0, 4, 8, 3]) {
			const position: PanelPosition = {
				name: "p",
				myAnchor: myAnchor as TextAnchor,
				parentAnchor: parentAnchor as TextAnchor,
				offset: [7, -12]
			}
			panel.setPosition(position, false)
			flushSync()

			const r = element.getBoundingClientRect()
			const p = parent.getBoundingClientRect()
			const actual = [r.left - p.left, p.bottom - r.bottom]
			// Unity's result doesn't depend on the RectTransform's own anchor and pivot.
			for (const [anchor, pivot] of [
				[
					[0, 0],
					[0, 0]
				],
				[
					[0.5, 0.5],
					[0.5, 0.5]
				],
				[
					[1, 0],
					[0, 1]
				]
			] satisfies [Vector2, Vector2][])
				expect(actual, `${myAnchor} on ${parentAnchor}`).toEqual(
					unityLowerLeft(position, anchor, pivot)
				)
		}
})

test("the canvas is 480 reference pixels tall and as wide as the screen's aspect", async () => {
	parent = document.createElement("div")
	Object.assign(parent.style, { position: "relative", width: "800px", height: "240px" })
	document.body.append(parent)
	const children = createRawSnippet(() => ({ render: () => "<p>hi</p>" }))
	const screen = await render(
		UICanvas,
		{ props: { name: "Canvas", children } },
		{ baseElement: parent }
	)
	expect(screen.getByRole("region", { name: "Canvas" }).element()).toBe(screen.container.firstChild)

	const canvas = screen.container.querySelector<HTMLElement>(".canvas")
	expect(canvas?.offsetWidth).toBe(1600)
	expect(canvas?.offsetHeight).toBe(480)
	const r = canvas?.getBoundingClientRect()
	expect([r?.width, r?.height]).toEqual([800, 240])
})
