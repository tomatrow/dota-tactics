<!--
	The viewer for one map: its state, shared with everything below, the 3D stage and the windows.
-->
<script lang="ts">
	import type { MapModel } from "#lib/map/model.ts"
	import { setViewerState, ViewerState } from "#lib/state.svelte.ts"
	import ControlsWindow from "./ControlsWindow.svelte"
	import HeaderWindow from "./HeaderWindow.svelte"
	import InfoWindow from "./InfoWindow.svelte"
	import LegendWindow from "./LegendWindow.svelte"
	import Stage from "./Stage.svelte"

	let { model }: { model: MapModel } = $props()

	// One map per viewer: `{#key}` it to load another.
	// svelte-ignore state_referenced_locally
	const view = setViewerState(new ViewerState(model))

	function onkeydown(event: KeyboardEvent) {
		const typing =
			event.target instanceof Element && event.target.closest("input, select, textarea")
		if (typing || event.metaKey || event.ctrlKey || event.altKey) return
		const key = event.key.toLowerCase()
		if (key === "q") view.rotate(-1)
		else if (key === "e") view.rotate(1)
		else if (key === "r") view.home()
		else if (key === "escape") view.pinned = null
	}
</script>

<svelte:window {onkeydown} />

<Stage />
<HeaderWindow />
<LegendWindow />
<InfoWindow />
<ControlsWindow />
