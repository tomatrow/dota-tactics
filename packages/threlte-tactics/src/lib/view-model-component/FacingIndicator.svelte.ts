import type { Directions } from "#lib/enums/Directions.ts"

/**
 * Port of `View Model Component/FacingIndicator.cs`: four spheres around the selected tile, the
 * one the actor faces highlighted. A child of the tile selection indicator, inactive until
 * `EndFacingState`. Rendered by `<FacingIndicatorView>`.
 */
export class FacingIndicator {
	/** `gameObject.activeSelf` (the prefab's is off). */
	active = $state(false)
	/** The highlighted sphere's direction (`null`: none set yet, all spheres default). */
	direction: Directions | null = $state(null)

	setDirection(dir: Directions): void {
		this.direction = dir
	}
}
