<script lang="ts">
	import { getViewerState, type Visibility } from "#lib/state.svelte.ts"

	const view = getViewerState()

	const toggles: { key: keyof Visibility; label: string }[] = [
		{ key: "trees", label: "Trees" },
		{ key: "entities", label: "Entities" },
		{ key: "allMarkers", label: "All markers" },
		{ key: "lanes", label: "Lanes" },
		{ key: "labels", label: "Labels" },
		{ key: "grid", label: "Grid" },
		{ key: "ao", label: "AO" }
	]
</script>

<nav class="win" aria-label="View controls">
	<div class="row">
		<button onclick={() => view.rotate(-1)} type="button">Rotate left</button>
		<button onclick={() => view.rotate(1)} type="button">Rotate right</button>
		<button onclick={() => view.home()} type="button">Reset view</button>
	</div>
	<div class="row">
		{#each toggles as { key, label } (key)}
			<button
				aria-pressed={view.visibility[key]}
				onclick={() => (view.visibility[key] = !view.visibility[key])}
				type="button">{label}</button
			>
		{/each}
	</div>
	<label class="row">
		<span>Height ×{view.verticalScale.toFixed(2)}</span>
		<input max="3" min="0.5" step="0.25" type="range" bind:value={view.verticalScale} />
	</label>
</nav>

<style>
	nav {
		bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		right: 12px;
		display: grid;
		gap: 6px;
		max-width: calc(100vw - 24px);
		padding: 8px;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		justify-content: flex-end;
	}
	button {
		font: 500 12.5px var(--body);
		color: var(--fg);
		background: rgb(0 0 0 / 0.28);
		border: 1px solid rgb(205 189 140 / 0.55);
		border-radius: 4px;
		padding: 6px 10px;
		cursor: pointer;
	}
	button:hover {
		border-color: var(--edge);
		background: rgb(255 255 255 / 0.06);
	}
	button:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--cursor);
		outline-offset: 2px;
	}
	button[aria-pressed="false"] {
		color: var(--muted);
		border-style: dashed;
	}
	label {
		align-items: center;
		font-size: 12.5px;
		font-variant-numeric: tabular-nums;
	}
	label span {
		min-width: 86px;
		text-align: right;
	}
	input[type="range"] {
		width: 180px;
		accent-color: var(--edge);
	}
	@media (max-width: 640px) {
		nav {
			left: 12px;
		}
		.row {
			justify-content: center;
		}
		button {
			padding: 6px 8px;
		}
	}
</style>
