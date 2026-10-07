import { quadInOut } from "svelte/easing"
import { Tween } from "svelte/motion"
import { tween, type Easing, type LoopOptions } from "#lib/common/animation/Tweener.ts"
import type { Vector3 } from "./vector3.ts"

/**
 * The parts of a Unity `Transform` that game code moves, plus the tweening extension methods of
 * `Common/Animation/TransformAnimationExtensions.cs`. Views render from it.
 *
 * Every Unity object that moves in this port sits under parents at the origin, unrotated and
 * unscaled, so world space (`MoveTo`, `position`) and local space are the same thing.
 */
export class Transform {
	readonly #localPosition: Tween<Vector3>
	readonly #localEulerAngles: Tween<Vector3>
	readonly #localScale: Tween<Vector3>

	constructor({
		localPosition = [0, 0, 0],
		localEulerAngles = [0, 0, 0],
		localScale = [1, 1, 1]
	}: { localPosition?: Vector3; localEulerAngles?: Vector3; localScale?: Vector3 } = {}) {
		this.#localPosition = new Tween(localPosition)
		this.#localEulerAngles = new Tween(localEulerAngles)
		this.#localScale = new Tween(localScale)
	}

	get localPosition(): Vector3 {
		return this.#localPosition.current
	}

	set localPosition(value: Vector3) {
		void this.#localPosition.set(value, { duration: 0 })
	}

	/** In degrees, each in [0, 360) like Unity's (which reads them back from a quaternion). */
	get localEulerAngles(): Vector3 {
		const [x, y, z] = this.#localEulerAngles.current
		return [normalizeAngle(x), normalizeAngle(y), normalizeAngle(z)]
	}

	set localEulerAngles(value: Vector3) {
		void this.#localEulerAngles.set(value, { duration: 0 })
	}

	get localScale(): Vector3 {
		return this.#localScale.current
	}

	set localScale(value: Vector3) {
		void this.#localScale.set(value, { duration: 0 })
	}

	/** Unity's `MoveTo` (world space, which is local space here). */
	moveTo(
		position: Vector3,
		duration = 1,
		equation: Easing = quadInOut,
		loop?: LoopOptions
	): Promise<void> {
		return this.moveToLocal(position, duration, equation, loop)
	}

	moveToLocal(
		position: Vector3,
		duration = 1,
		equation: Easing = quadInOut,
		loop?: LoopOptions
	): Promise<void> {
		return tween(this.#localPosition, this.localPosition, position, duration, equation, loop)
	}

	/**
	 * Unity's `RotateToLocal`. Tweens the Euler angles component-wise, so `start` lets callers pick
	 * which way round to turn (Unity code edits the returned tweener's `startTweenValue`).
	 */
	rotateToLocal(
		euler: Vector3,
		duration: number,
		equation: Easing,
		{ start = this.localEulerAngles, ...loop }: LoopOptions & { start?: Vector3 } = {}
	): Promise<void> {
		return tween(this.#localEulerAngles, start, euler, duration, equation, loop)
	}

	scaleTo(
		scale: Vector3,
		duration = 1,
		equation: Easing = quadInOut,
		loop?: LoopOptions
	): Promise<void> {
		return tween(this.#localScale, this.localScale, scale, duration, equation, loop)
	}
}

function normalizeAngle(degrees: number): number {
	return ((degrees % 360) + 360) % 360
}
