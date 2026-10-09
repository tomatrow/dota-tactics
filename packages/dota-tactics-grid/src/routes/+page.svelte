<script lang="ts">
	import ControlsWindow from "#lib/components/ControlsWindow.svelte"
	import HeaderWindow from "#lib/components/HeaderWindow.svelte"
	import InfoWindow from "#lib/components/InfoWindow.svelte"
	import LegendWindow from "#lib/components/LegendWindow.svelte"
	import Stage from "#lib/components/Stage.svelte"
	import { layerStyle } from "#lib/map/layers.ts"
	import { loadMap } from "#lib/map/load.ts"
	import type { Viewer } from "#lib/scene/viewer.ts"
	import { ViewerState } from "#lib/state.svelte.ts"

	const view = new ViewerState()
	let viewer = $state.raw<Viewer>()
	const loading = loadMap()

	function onkeydown(event: KeyboardEvent) {
		const typing =
			event.target instanceof Element && event.target.closest("input, select, textarea")
		if (typing || event.metaKey || event.ctrlKey || event.altKey) return
		const key = event.key.toLowerCase()
		if (key === "q") viewer?.rotate(-1)
		else if (key === "e") viewer?.rotate(1)
		else if (key === "r") viewer?.home()
		else if (key === "escape") view.pinned = null
	}
</script>

<svelte:head>
	<title>Dota Tactics Grid</title>
</svelte:head>

<svelte:window {onkeydown} />

{#await loading}
	<div class="win" role="status">Loading the map…</div>
{:then model}
	{const look = $derived(layerStyle(model, view.layer))}
	<Stage layerStyle={look} {model} {view} bind:viewer />
	<HeaderWindow {model} />
	<LegendWindow legend={look.legend} bind:layer={view.layer} />
	<InfoWindow focus={view.focus} {model} pinned={view.pinned !== null} />
	<ControlsWindow {view} {viewer} />
{:catch error}
	<div class="win" role="alert">
		<strong>Couldn't load dota_map.json</strong>
		<p>{error instanceof Error ? error.message : String(error)}</p>
		<p>Run <code>mise run extract</code> in <code>packages/dota-cartographer</code>.</p>
	</div>
{/await}

<style>
	div {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-family: var(--display);
		font-size: 16px;
		letter-spacing: 0.04em;
		max-width: min(480px, calc(100vw - 24px));
	}
	p {
		font-family: var(--body);
		font-size: 13px;
		margin: 6px 0 0;
	}
	code {
		font-family: var(--mono);
	}
</style>
