<script lang="ts">
	import { LAYER_MODES } from "#lib/map/layers.ts"
	import { getViewerState } from "#lib/state.svelte.ts"

	const view = getViewerState()
	const legend = $derived(view.look.legend)

	const n = (value: number) => value.toLocaleString("en-US")
	const markers = [
		{ colour: "#74d48e", label: "Radiant structures" },
		{ colour: "#e3624f", label: "Dire structures" },
		{ colour: "#e8c35f", label: "Neutral: outposts, shops, camps" },
		{ colour: "#7a4fa8", label: "Roshan" },
		{ colour: "#5fe0e8", label: "Power rune" }
	]
	const lanes = [
		{ colour: "#74d48e", label: "Radiant creep path" },
		{ colour: "#e3624f", label: "Dire creep path" }
	]
	let open = $state(true)
	// Start folded on narrow screens.
	$effect(() => {
		if (window.innerWidth < 640) open = false
	})
</script>

<details class="win" bind:open>
	<summary>Legend</summary>
	<label>
		<span>Layer</span>
		<select bind:value={view.layer}>
			{#each LAYER_MODES as mode (mode.id)}
				<option value={mode.id}>{mode.label}</option>
			{/each}
		</select>
	</label>

	{#if legend.kind === "swatches"}
		<ul>
			{#each legend.items as item (item.label)}
				<li>
					<span style:background={item.colour} class="sw"></span>
					<span class="name">{item.label}</span>
					{#if item.count !== undefined}<span class="count">{n(item.count)}</span>{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div style:background="linear-gradient(90deg, {legend.stops.join(', ')})" class="ramp"></div>
		<div class="ends"><span>{legend.min}</span><span>{legend.max}</span></div>
		<p>{legend.caption}</p>
	{/if}

	<h3>Markers</h3>
	<ul>
		{#each markers as item (item.label)}
			<li><span style:background={item.colour} class="sw dot"></span>{item.label}</li>
		{/each}
		{#each lanes as item (item.label)}
			<li><span style:background={item.colour} class="sw line"></span>{item.label}</li>
		{/each}
	</ul>
</details>

<style>
	details {
		top: calc(12px + env(safe-area-inset-top, 0px));
		right: 12px;
		width: 250px;
		padding: 8px 12px;
	}
	summary {
		cursor: pointer;
		font-family: var(--display);
		font-size: 15px;
		letter-spacing: 0.05em;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary::after {
		content: "▾";
		float: right;
		color: var(--edge);
	}
	details[open] summary::after {
		content: "▴";
	}
	label {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 8px 0 4px;
		font-size: 12px;
		color: var(--muted);
	}
	select {
		flex: 1;
		font: 500 12.5px var(--body);
		color: var(--fg);
		background: rgb(0 0 0 / 0.3);
		border: 1px solid rgb(205 189 140 / 0.55);
		border-radius: 4px;
		padding: 4px 6px;
	}
	select:focus-visible {
		outline: 2px solid var(--cursor);
		outline-offset: 1px;
	}
	ul {
		list-style: none;
		margin: 6px 0 2px;
		padding: 0;
		display: grid;
		gap: 4px;
	}
	li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12.5px;
	}
	.name {
		flex: 1;
	}
	.count {
		color: var(--muted);
		font-family: var(--mono);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	h3 {
		margin: 10px 0 2px;
		font-size: 10.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		font-weight: 500;
	}
	.sw {
		width: 14px;
		height: 14px;
		border-radius: 2px;
		flex: none;
		border: 1px solid rgb(0 0 0 / 0.4);
	}
	.sw.dot {
		border-radius: 50%;
	}
	.sw.line {
		height: 4px;
		border: none;
		border-radius: 2px;
	}
	.ramp {
		height: 12px;
		margin-top: 8px;
		border-radius: 2px;
		border: 1px solid rgb(0 0 0 / 0.4);
	}
	.ends {
		display: flex;
		justify-content: space-between;
		font-family: var(--mono);
		font-size: 11px;
		color: var(--muted);
		margin-top: 2px;
	}
	p {
		margin: 2px 0 0;
		font-size: 12px;
	}
	@media (max-width: 640px) {
		details {
			top: auto;
			bottom: calc(150px + env(safe-area-inset-bottom, 0px));
			width: 200px;
		}
	}
</style>
