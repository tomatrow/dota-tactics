import { Point } from "#lib/model/Point.ts"

/**
 * The project's Input Manager axes (`ProjectSettings/InputManager.asset`), as
 * `KeyboardEvent.code`s. Physical key positions, so WASD works on any keyboard layout.
 */
export const axes = {
	Horizontal: { negative: ["ArrowLeft", "KeyA"], positive: ["ArrowRight", "KeyD"] },
	Vertical: { negative: ["ArrowDown", "KeyS"], positive: ["ArrowUp", "KeyW"] }
} as const satisfies Record<string, { negative: string[]; positive: string[] }>

/**
 * Keys for the `Fire1` (confirm), `Fire2` (cancel) and `Fire3` buttons, clear of browser shortcuts
 * (see `PORTING.md` › Divergences). The game never checks Fire3.
 */
export const buttons = [["Enter", "NumpadEnter", "Space"], ["Escape", "Backspace"], []] as const

/** Port of the private `Repeater` class in `InputController.cs`. */
export class Repeater {
	/** Seconds to wait between the initial press and the first repeat. */
	static readonly threshold = 0.5
	/** Seconds between repeats. */
	static readonly rate = 0.25

	#next = 0
	#hold = false

	/**
	 * @param value The axis's raw value: -1, 0 or 1.
	 * @param time The current time in seconds.
	 * @returns `value` when it should register as input, otherwise 0.
	 */
	update(value: number, time: number): number {
		let retValue = 0

		if (value !== 0) {
			if (time > this.#next) {
				retValue = value
				this.#next = time + (this.#hold ? Repeater.rate : Repeater.threshold)
				this.#hold = true
			}
		} else {
			this.#hold = false
			this.#next = 0
		}

		return retValue
	}
}

export interface InputEvents {
	/** A direction on the board (or menu), repeating while held. */
	move?: (direction: Point) => void
	/** The index of the released Fire button (0 confirm, 1 cancel). */
	fire?: (button: number) => void
}

/**
 * Port of `Controller/InputController.cs`. The owner feeds in key presses (`keyDown`/`keyUp`) and
 * calls `update` every frame while `moving` is true (see `Input.svelte`); input comes out through
 * the `events` callbacks.
 */
export class InputController {
	readonly #events: InputEvents
	readonly #pressed = new Set<string>()
	readonly #hor = new Repeater()
	readonly #ver = new Repeater()

	constructor(events: InputEvents) {
		this.#events = events
	}

	/** Whether a direction is held, i.e. whether `update` needs calling every frame. */
	get moving(): boolean {
		return this.#axisRaw(axes.Horizontal) !== 0 || this.#axisRaw(axes.Vertical) !== 0
	}

	/** Records a key press. Returns whether the key is bound to an axis or button. */
	keyDown(code: string): boolean {
		if (!isBound(code)) return false
		this.#pressed.add(code)
		return true
	}

	/**
	 * Records a key release, firing `fire` when it releases a button.
	 * Returns whether the key is bound to an axis or button.
	 */
	keyUp(code: string): boolean {
		if (!isBound(code)) return false
		if (!this.#pressed.delete(code)) return true

		const button = buttons.findIndex((keys) => (keys as readonly string[]).includes(code))
		if (button >= 0 && !buttons[button]!.some((key) => this.#pressed.has(key))) {
			this.#events.fire?.(button)
		}
		return true
	}

	/** Forgets every held key, e.g. when the window loses focus and stops sending key events. */
	releaseAll(): void {
		this.#pressed.clear()
	}

	/** Fires `move` for held directions, repeating; buttons fire on `keyUp`. `time`: seconds. */
	update(time: number): void {
		const x = this.#hor.update(this.#axisRaw(axes.Horizontal), time)
		const y = this.#ver.update(this.#axisRaw(axes.Vertical), time)
		if (x !== 0 || y !== 0) {
			this.#events.move?.(Point.of(x, y))
		}
	}

	/** An axis's value from the held keys: -1, 0 or 1. Opposite keys cancel out. */
	#axisRaw(axis: (typeof axes)[keyof typeof axes]): number {
		const positive = axis.positive.some((key) => this.#pressed.has(key)) ? 1 : 0
		const negative = axis.negative.some((key) => this.#pressed.has(key)) ? 1 : 0
		return positive - negative
	}
}

const boundKeys: ReadonlySet<string> = new Set([
	...Object.values(axes).flatMap((axis) => [...axis.negative, ...axis.positive]),
	...buttons.flat()
])

function isBound(code: string): boolean {
	return boundKeys.has(code)
}
