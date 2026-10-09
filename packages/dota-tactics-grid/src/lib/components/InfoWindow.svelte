<script lang="ts">
	import { describeEntity, describeTile } from "#lib/map/describe.ts"
	import type { MapModel } from "#lib/map/model.ts"
	import type { Team } from "#lib/map/schema.ts"
	import type { Selection } from "#lib/selection.ts"

	let { model, focus, pinned }: { model: MapModel; focus: Selection | null; pinned: boolean } =
		$props()

	const TEAM_COLOURS: Partial<Record<Team, string>> = {
		radiant: "var(--radiant)",
		dire: "var(--dire)"
	}

	const info = $derived(
		!focus ? null
		: focus.kind === "entity" ? describeEntity(model, focus.entity)
		: describeTile(model, focus.col, focus.row)
	)
</script>

<section class="win" aria-live="polite">
	{#if info}
		<div style:color={TEAM_COLOURS[info.team]}>{info.title}</div>
		<dl>
			{#each info.rows as [label, value], k (k)}
				<dt>{label}</dt>
				<dd>{value}</dd>
			{/each}
		</dl>
		<p>
			{pinned ?
				"Pinned · click it again or press Esc to release"
			:	"Click to pin · Q / E rotate · R reset"}
		</p>
	{:else}
		<div>Select a tile</div>
		<p>
			Hover or click the map. Drag to orbit, right-drag to pan, scroll to zoom. Q / E rotate, R
			resets the view.
		</p>
	{/if}
</section>

<style>
	section {
		bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		left: 12px;
		width: 300px;
		min-height: 96px;
	}
	div {
		font-family: var(--display);
		font-size: 16px;
		letter-spacing: 0.03em;
		margin-bottom: 4px;
	}
	dl {
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px 12px;
		font-family: var(--mono);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	p {
		margin: 6px 0 0;
		color: var(--muted);
		font-size: 12px;
	}
	@media (max-width: 640px) {
		section {
			width: auto;
			right: 12px;
			bottom: calc(64px + env(safe-area-inset-bottom, 0px));
			min-height: 0;
		}
	}
</style>
