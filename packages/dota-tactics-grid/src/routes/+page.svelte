<script lang="ts">
	import Viewer from "#lib/components/Viewer.svelte"
	import { loadMap } from "#lib/map/load.ts"

	const loading = loadMap()
</script>

<svelte:head>
	<title>Dota Tactics Grid</title>
</svelte:head>

{#await loading}
	<div class="win" role="status">Loading the map…</div>
{:then model}
	<Viewer {model} />
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
