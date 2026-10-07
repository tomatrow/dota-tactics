import { expect, test, vi } from "vitest"
import { render } from "vitest-browser-svelte"
import { Point } from "#lib/model/Point.ts"
import Input from "./Input.svelte"

function key(type: "keydown" | "keyup", code: string, init: KeyboardEventInit = {}) {
	const event = new KeyboardEvent(type, { code, cancelable: true, ...init })
	window.dispatchEvent(event)
	return event
}

test("moves at once on key down and fires on key up", async () => {
	const onmove = vi.fn()
	const onfire = vi.fn()
	await render(Input, { onmove, onfire })

	expect(key("keydown", "ArrowLeft").defaultPrevented).toBe(true)
	expect(onmove).toHaveBeenCalledExactlyOnceWith(Point.of(-1, 0))
	key("keyup", "ArrowLeft")

	key("keydown", "Escape")
	expect(onfire).not.toHaveBeenCalled()
	key("keyup", "Escape")
	expect(onfire).toHaveBeenCalledExactlyOnceWith(1)
})

test("repeats while a direction is held", async () => {
	const onmove = vi.fn()
	await render(Input, { onmove })

	key("keydown", "KeyW")
	await vi.waitFor(() => expect(onmove).toHaveBeenCalledTimes(2), { timeout: 1000 })
	key("keyup", "KeyW")
	expect(onmove).toHaveBeenLastCalledWith(Point.of(0, 1))
})

test("leaves unbound keys and shortcuts alone", async () => {
	const onmove = vi.fn()
	await render(Input, { onmove })

	expect(key("keydown", "KeyQ").defaultPrevented).toBe(false)
	expect(key("keydown", "KeyW", { metaKey: true }).defaultPrevented).toBe(false)
	expect(onmove).not.toHaveBeenCalled()
})

test("forgets held keys when the window loses focus", async () => {
	const onfire = vi.fn()
	await render(Input, { onfire })

	key("keydown", "Enter")
	window.dispatchEvent(new FocusEvent("blur"))
	key("keyup", "Enter")
	expect(onfire).not.toHaveBeenCalled()
})
