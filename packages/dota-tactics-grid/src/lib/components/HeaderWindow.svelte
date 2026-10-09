<script lang="ts">
	import { getViewerState } from "#lib/state.svelte.ts"

	const { model } = getViewerState()

	const n = (value: number) => value.toLocaleString("en-US")
	const meta = $derived(model.data.meta)
</script>

<header class="win">
	<h1>Dota Tactics Grid</h1>
	<p>{model.cols} × {model.rows} tiles · 1 tile = {model.cell} units</p>
	<p>
		{meta.source.map}.vpk {meta.source.sha256.slice(0, 8)} · {n(model.data.trees.length)} trees · {n(
			model.data.entities.length
		)} entities
	</p>
</header>

<style>
	header {
		top: calc(12px + env(safe-area-inset-top, 0px));
		left: 12px;
		max-width: min(380px, calc(100vw - 24px));
	}
	h1 {
		font-family: var(--display);
		font-weight: 700;
		font-size: 22px;
		letter-spacing: 0.04em;
		margin: 0;
		text-wrap: balance;
	}
	p {
		margin: 2px 0 0;
		color: var(--muted);
		font-family: var(--mono);
		font-size: 11.5px;
		font-variant-numeric: tabular-nums;
	}
</style>
