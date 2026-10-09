<script lang="ts">
	import type { LayerStyle } from "#lib/map/layers.ts"
	import type { MapModel } from "#lib/map/model.ts"
	import { Viewer } from "#lib/scene/viewer.ts"
	import { sameSelection } from "#lib/selection.ts"
	import type { ViewerState } from "#lib/state.svelte.ts"

	interface Props {
		model: MapModel
		view: ViewerState
		layerStyle: LayerStyle
		viewer?: Viewer
	}

	let { model, view, layerStyle, viewer = $bindable() }: Props = $props()
	let container: HTMLDivElement

	$effect(() => {
		const created = new Viewer(container, model, {
			hover: (selection) => (view.hover = selection),
			// Clicking pins; clicking the pinned thing again (or off the board) releases it.
			click: (selection) =>
				(view.pinned = selection && !sameSelection(selection, view.pinned) ? selection : null)
		})
		viewer = created
		return () => {
			viewer = undefined
			created.dispose()
		}
	})

	$effect(() => viewer?.setLayer(view.layer, layerStyle))
	$effect(() => viewer?.setVisibility(view.visibility))
	$effect(() => viewer?.setVerticalScale(view.verticalScale))
	$effect(() => viewer?.setPinned(view.pinned))
</script>

<div
	bind:this={container}
	aria-label="Isometric tactics grid of the Dota 2 map"
	role="application"
></div>

<style>
	div {
		position: fixed;
		inset: 0;
		touch-action: none;
		overflow: hidden;
	}
	div :global(.labels) {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
</style>
