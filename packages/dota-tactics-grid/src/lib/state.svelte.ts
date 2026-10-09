import type { CameraControlsRef } from "@threlte/extras"
import { createContext } from "svelte"
import { layerStyle, type LayerMode, type LayerStyle } from "#lib/map/layers.ts"
import type { MapModel } from "#lib/map/model.ts"
import { HOME_POSITION, HOME_TARGET, quarterTurn } from "#lib/scene/camera.ts"
import { sameSelection, type Selection } from "#lib/selection.ts"

export interface Visibility {
	trees: boolean
	entities: boolean
	allMarkers: boolean
	lanes: boolean
	labels: boolean
	grid: boolean
	ao: boolean
}

const smoothMotion = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** The viewer's state for one map: the UI windows and the scene both read it. */
export class ViewerState {
	readonly model: MapModel
	layer = $state<LayerMode>("terrain")
	/** How the board is coloured in the current layer, and its legend. */
	readonly look: LayerStyle
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
	/** The camera rig's controls, once it's mounted. */
	controls = $state.raw<CameraControlsRef>()

	constructor(model: MapModel) {
		this.model = model
		this.look = $derived(layerStyle(this.model, this.layer))
	}

	/** Clicking pins; clicking the pinned thing again (or off the board) releases it. */
	readonly click = (selection: Selection | null) => {
		this.pinned = selection && !sameSelection(selection, this.pinned) ? selection : null
	}

	/** Turns the view 90° (FFT-style), snapping to the diagonals. */
	rotate(direction: 1 | -1) {
		const controls = this.controls
		if (!controls) return
		void controls.rotateAzimuthTo(quarterTurn(controls.azimuthAngle, direction), smoothMotion())
	}

	home() {
		const controls = this.controls
		if (!controls) return
		const smooth = smoothMotion()
		void controls.setLookAt(...HOME_POSITION, ...HOME_TARGET, smooth)
		void controls.zoomTo(1, smooth)
	}
}

export const [getViewerState, setViewerState] = createContext<ViewerState>()
