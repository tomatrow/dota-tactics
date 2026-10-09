import type { Easing } from "#lib/common/animation/Tweener.ts"
import type { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
import type { Vector2 } from "#lib/common/vector.ts"
import { LayoutAnchor } from "./LayoutAnchor.svelte.ts"

/** Port of `Panel.Position`: a named place for a panel (Unity sets these up in the inspector). */
export interface PanelPosition {
	name: string
	myAnchor: TextAnchor
	parentAnchor: TextAnchor
	/** Reference pixels, y up. */
	offset: Vector2
}

/** What Unity callers change on the `Tweener` that `SetPosition` returns. */
export interface PanelTweenOptions {
	/** Seconds. */
	duration?: number
	equation?: Easing
}

/**
 * Port of `Common/UI/Panel.cs`: a UI rect with named positions it snaps or tweens between. Rendered
 * by `<PanelView>`.
 */
export class Panel {
	readonly anchor = new LayoutAnchor()
	readonly #positionMap = new Map<string, PanelPosition>()
	#currentPosition: PanelPosition | null = null
	#transition: Promise<void> | null = null

	/** `positionList` is the inspector's list; the panel starts at its first position. */
	constructor(positionList: readonly PanelPosition[]) {
		for (let i = positionList.length - 1; i >= 0; --i) this.addPosition(positionList[i])
		// Unity's `Start` (anything that sets a position first overrides it).
		if (positionList.length > 0) this.setPosition(positionList[0], false)
	}

	get currentPosition(): PanelPosition | null {
		return this.#currentPosition
	}

	get inTransition(): boolean {
		return this.#transition !== null
	}

	/** Unity's indexer, `panel[name]`. */
	get(name: string): PanelPosition | null {
		return this.#positionMap.get(name) ?? null
	}

	addPosition(p: PanelPosition): void {
		this.#positionMap.set(p.name, p)
	}

	removePosition(p: PanelPosition): void {
		this.#positionMap.delete(p.name)
	}

	/**
	 * Snaps (returns `null`) or tweens to a position. The returned promise resolves when the tween
	 * completes, never if another `setPosition` interrupts it (Unity's `Stop`). Returns `null`, and
	 * leaves the panel where it is, for an unknown position.
	 */
	setPosition(position: string | PanelPosition | null, animated: false): null
	setPosition(
		position: string | PanelPosition | null,
		animated: boolean,
		options?: PanelTweenOptions
	): Promise<void> | null
	setPosition(
		position: string | PanelPosition | null,
		animated: boolean,
		{ duration, equation }: PanelTweenOptions = {}
	): Promise<void> | null {
		const p = typeof position === "string" ? this.get(position) : position
		this.#currentPosition = p
		if (p === null) return null

		// (Snapping or starting a new tween stops the current one.)
		this.#transition = null

		if (!animated) {
			this.anchor.snapToAnchorPosition(p.myAnchor, p.parentAnchor, p.offset)
			return null
		}

		const transition = this.anchor.moveToAnchorPosition(
			p.myAnchor,
			p.parentAnchor,
			p.offset,
			duration,
			equation
		)
		this.#transition = transition
		void transition.then(() => {
			if (this.#transition === transition) this.#transition = null
		})
		return transition
	}
}
