import type { LayerMode } from "#lib/map/layers.ts"
import type { Visibility } from "#lib/scene/viewer.ts"
import type { Selection } from "#lib/selection.ts"

/** The page's UI state; the stage pushes it into the three.js viewer. */
export class ViewerState {
	layer = $state<LayerMode>("terrain")
	visibility = $state<Visibility>({
		trees: true,
		entities: true,
		allMarkers: false,
		lanes: true,
		labels: true,
		grid: true,
		ao: true
	})
	/** Vertical exaggeration; 1 = true proportions. */
	verticalScale = $state(1)
	hover = $state.raw<Selection | null>(null)
	pinned = $state.raw<Selection | null>(null)
	/** What the info panel shows: the pinned selection wins over the hover. */
	readonly focus = $derived(this.pinned ?? this.hover)
}
