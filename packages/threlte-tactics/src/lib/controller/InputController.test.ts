import { describe, expect, test, vi } from "vitest"
import { Point } from "#lib/model/Point.ts"
import { InputController, Repeater } from "./InputController.ts"

describe("Repeater", () => {
	test("registers a press at once, again after the threshold, then at the repeat rate", () => {
		const repeater = new Repeater()
		// Press at 0.1; threshold until 0.6; then every 0.25 s from the last registered press.
		const frames = [0.1, 0.5, 0.65, 0.8, 0.95, 1.1, 1.25]
		expect(frames.map((time) => repeater.update(1, time))).toEqual([1, 0, 1, 0, 1, 0, 1])
	})

	test("resets when the axis is released", () => {
		const repeater = new Repeater()
		expect(repeater.update(-1, 1)).toBe(-1)
		expect(repeater.update(-1, 1.2)).toBe(0)
		expect(repeater.update(0, 1.3)).toBe(0)
		expect(repeater.update(-1, 1.31)).toBe(-1)
		// Holding again waits for the full threshold, not the repeat rate.
		expect(repeater.update(-1, 1.6)).toBe(0)
		expect(repeater.update(-1, 1.82)).toBe(-1)
	})
})

describe("InputController", () => {
	function setup() {
		const move = vi.fn<(direction: Point) => void>()
		const fire = vi.fn<(button: number) => void>()
		return { input: new InputController({ move, fire }), move, fire }
	}

	test("moves along the axes: arrows and WASD, up is +y", () => {
		const { input, move } = setup()
		const cases = [
			["ArrowRight", Point.of(1, 0)],
			["KeyA", Point.of(-1, 0)],
			["KeyW", Point.of(0, 1)],
			["ArrowDown", Point.of(0, -1)]
		] as const
		for (const [code, direction] of cases) {
			input.keyDown(code)
			input.update(1)
			input.keyUp(code)
			input.update(1)
			expect(move).toHaveBeenLastCalledWith(direction)
		}
		expect(move).toHaveBeenCalledTimes(4)
	})

	test("pressing two axes in the same frame moves diagonally", () => {
		const { input, move } = setup()
		input.keyDown("ArrowRight")
		input.keyDown("ArrowUp")
		input.update(1)
		expect(move).toHaveBeenCalledExactlyOnceWith(Point.of(1, 1))
	})

	test("opposite keys cancel out", () => {
		const { input, move } = setup()
		input.keyDown("ArrowLeft")
		input.keyDown("KeyD")
		input.update(1)
		expect(move).not.toHaveBeenCalled()
		expect(input.moving).toBe(false)
	})

	test("tracks whether a direction is held", () => {
		const { input } = setup()
		expect(input.moving).toBe(false)
		input.keyDown("KeyS")
		expect(input.moving).toBe(true)
		input.keyUp("KeyS")
		expect(input.moving).toBe(false)
	})

	test("fires a button when it is released", () => {
		const { input, fire } = setup()
		input.keyDown("Enter")
		expect(fire).not.toHaveBeenCalled()
		input.keyUp("Enter")
		input.keyDown("Escape")
		input.keyUp("Escape")
		expect(fire.mock.calls).toEqual([[0], [1]])
	})

	test("a button with two keys held fires once, when the last is released", () => {
		const { input, fire } = setup()
		input.keyDown("Enter")
		input.keyDown("Space")
		input.keyUp("Enter")
		expect(fire).not.toHaveBeenCalled()
		input.keyUp("Space")
		expect(fire).toHaveBeenCalledExactlyOnceWith(0)
	})

	test("ignores releases of keys it never saw pressed", () => {
		const { input, fire } = setup()
		input.keyDown("Backspace")
		input.releaseAll()
		expect(input.keyUp("Backspace")).toBe(true)
		expect(fire).not.toHaveBeenCalled()
	})

	test("reports which keys are bound", () => {
		const { input } = setup()
		expect(input.keyDown("KeyQ")).toBe(false)
		expect(input.keyUp("KeyQ")).toBe(false)
		expect(input.keyDown("Space")).toBe(true)
	})
})
