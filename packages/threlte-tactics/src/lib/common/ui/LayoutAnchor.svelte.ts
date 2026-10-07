import { quadInOut } from "svelte/easing"
import { Tween } from "svelte/motion"
import { tween, type Easing } from "#lib/common/animation/Tweener.ts"
import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
import type { Vector2 } from "#lib/common/unity/vector2.ts"

/**
 * Where a rect sits in its parent, in a form CSS can lay out at any size: the rect's own `my`
 * point (fractions of its size from its lower-left corner) goes on the parent's `parent` point
 * (fractions of the parent's size) moved by `offset` (reference pixels, y up).
 *
 * Unity's `LayoutAnchor` resolves the same thing to an `anchoredPosition` in pixels. Keeping the
 * fractions lets the browser do the measuring, and tweening the six numbers moves the rect along
 * the same straight line Unity's tween does.
 */
export type AnchorPlacement = [
	parentX: number,
	parentY: number,
	myX: number,
	myY: number,
	offsetX: number,
	offsetY: number
]

/**
 * Port of `Common/UI/LayoutAnchor.cs` (plus `RectTransformAnimationExtensions.AnchorTo` and its
 * tweener): moves a rect relative to its parent by naming an anchor point on each. Rendered by
 * `<PanelView>`.
 */
export class LayoutAnchor {
	readonly #placement = new Tween<AnchorPlacement>(
		this.anchorPosition(TextAnchor.LowerLeft, TextAnchor.LowerLeft, [0, 0])
	)

	/** The current (possibly mid-tween) placement. Unity's `anchoredPosition`. */
	get placement(): AnchorPlacement {
		return this.#placement.current
	}

	snapToAnchorPosition(myAnchor: TextAnchor, parentAnchor: TextAnchor, offset: Vector2): void {
		void this.#placement.set(this.anchorPosition(myAnchor, parentAnchor, offset), { duration: 0 })
	}

	/**
	 * Tweens from the current placement. Defaults are Unity's `Tweener.DefaultDuration` and
	 * `DefaultEquation`. The promise resolves on completion and never if the tween is interrupted
	 * (Unity's `completedEvent` doesn't fire after `Stop`).
	 */
	moveToAnchorPosition(
		myAnchor: TextAnchor,
		parentAnchor: TextAnchor,
		offset: Vector2,
		duration = 1,
		equation: Easing = quadInOut
	): Promise<void> {
		const end = this.anchorPosition(myAnchor, parentAnchor, offset)
		return tween(this.#placement, this.placement, end, duration, equation)
	}

	anchorPosition(myAnchor: TextAnchor, parentAnchor: TextAnchor, offset: Vector2): AnchorPlacement {
		const [myX, myY] = getPosition(myAnchor)
		const [parentX, parentY] = getPosition(parentAnchor)
		return [parentX, parentY, myX, myY, offset[0], offset[1]]
	}
}

/** An anchor point as fractions of a rect's size, from its lower-left corner. */
function getPosition(anchor: TextAnchor): Vector2 {
	const column = anchor % 3
	const row = Math.floor(anchor / 3)
	return [column / 2, 1 - row / 2]
}
