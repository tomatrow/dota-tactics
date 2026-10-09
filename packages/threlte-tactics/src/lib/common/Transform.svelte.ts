import { quadInOut } from "svelte/easing"
import { Tween } from "svelte/motion"
import { tween, type Easing, type LoopOptions } from "#lib/common/animation/Tweener.ts"
import type { Vector3 } from "#lib/common/unity/vector3.ts"

/**
 * Where something that moves is (a unit, its jumper, the tile selection indicator), which way it
 * faces and how big it is. Views render it. Positions are world positions: whatever moves sits
 * under parents at the origin, unrotated and unscaled.
 *
 * Assigning snaps. `moveTo`, `rotateTo` and `scaleTo` tween from the current value and resolve when
 * the tween completes; a tween that a later one interrupts never resolves.
 */
export class Transform {
	readonly #position: Tween<Vector3>
	readonly #yaw: Tween<number>
	readonly #scale: Tween<Vector3>

	constructor({
		position = [0, 0, 0],
		yaw = 0,
		scale = [1, 1, 1]
	}: { position?: Vector3; yaw?: number; scale?: Vector3 } = {}) {
		this.#position = new Tween(position)
		this.#yaw = new Tween(yaw)
		this.#scale = new Tween(scale)
	}

	get position(): Vector3 {
		return this.#position.current
	}

	set position(value: Vector3) {
		void this.#position.set(value, { duration: 0 })
	}

	/** The rotation about the Y axis, in radians. */
	get yaw(): number {
		return this.#yaw.current
	}

	set yaw(value: number) {
		void this.#yaw.set(value, { duration: 0 })
	}

	get scale(): Vector3 {
		return this.#scale.current
	}

	set scale(value: Vector3) {
		void this.#scale.set(value, { duration: 0 })
	}

	moveTo(
		position: Vector3,
		duration = 1,
		easing: Easing = quadInOut,
		loop?: LoopOptions
	): Promise<void> {
		return tween(this.#position, this.position, position, duration, easing, loop)
	}

	rotateTo(
		yaw: number,
		duration = 1,
		easing: Easing = quadInOut,
		loop?: LoopOptions
	): Promise<void> {
		return tween(this.#yaw, this.yaw, yaw, duration, easing, loop)
	}

	scaleTo(
		scale: Vector3,
		duration = 1,
		easing: Easing = quadInOut,
		loop?: LoopOptions
	): Promise<void> {
		return tween(this.#scale, this.scale, scale, duration, easing, loop)
	}
}
