<script lang="ts">
	import { page } from "$app/state"
	import { loadMap } from "dota-tactics-grid/map/load.ts"
	import Game from "#lib/components/Game.svelte"
	import { Random } from "#lib/sim/random.ts"

	const loading = loadMap()
	// `?seed=` replays a game; otherwise each load is a new one.
	const param = page.url.searchParams.get("seed")
	const seed = param !== null && /^\d+$/.test(param) ? Number(param) : Random.randomSeed()
</script>

<svelte:head>
	<title>Dota Tactics</title>
</svelte:head>

{#await loading}
	<div class="win" role="status">Loading the map…</div>
{:then model}
	<Game {model} {seed} />
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
