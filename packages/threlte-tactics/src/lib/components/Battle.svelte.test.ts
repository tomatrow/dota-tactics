import { expect, test } from "vitest"
import { render } from "vitest-browser-svelte"
import Battle from "./Battle.svelte"

test("renders a canvas with a WebGL renderer attached", async () => {
	const { container } = await render(Battle)

	const canvas = container.querySelector("canvas")
	expect(canvas).toBeInstanceOf(HTMLCanvasElement)
	// A canvas that already holds a WebGL context refuses to hand out a 2D one.
	await expect.poll(() => canvas?.getContext("2d")).toBeNull()
})
