<!--
	One entity on the board: its model at its origin, turned to its facing (models face +X at yaw 0),
	and for landmarks a label floating above it.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { HTML } from "@threlte/extras"
	import { entityLabel, LABELLED_KINDS } from "#lib/map/entities.ts"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { sceneX, sceneY, sceneZ } from "#lib/scene/coords.ts"
	import { labelHeight } from "#lib/scene/palette.ts"
	import { getViewerState } from "#lib/state.svelte.ts"
	import Ancient from "./Ancient.svelte"
	import Barracks from "./Barracks.svelte"
	import Building from "./Building.svelte"
	import Fountain from "./Fountain.svelte"
	import LaneSpawner from "./LaneSpawner.svelte"
	import LotusPool from "./LotusPool.svelte"
	import NeutralCamp from "./NeutralCamp.svelte"
	import NeutralStash from "./NeutralStash.svelte"
	import Outpost from "./Outpost.svelte"
	import Pin from "./Pin.svelte"
	import Roshan from "./Roshan.svelte"
	import RoshanPit from "./RoshanPit.svelte"
	import Rune from "./Rune.svelte"
	import Shop from "./Shop.svelte"
	import Tormentor from "./Tormentor.svelte"
	import Tower from "./Tower.svelte"
	import TwinGate from "./TwinGate.svelte"
	import Watcher from "./Watcher.svelte"
	import WisdomShrine from "./WisdomShrine.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const view = getViewerState()
	const { model } = view

	/** The model's base, in game units. Roshan's pit marker is a trigger volume: it sits on the ground. */
	const base = $derived.by(() => {
		if (entity.kind !== "roshan_pit") return entity.z
		const cell = model.cellOf(entity.x, entity.y)
		const ground = cell ? model.height[model.index(...cell)] : Number.NaN
		return Number.isNaN(ground) ? entity.z : ground
	})
	const position = $derived<[number, number, number]>([
		sceneX(model, entity.x),
		sceneY(model, base, view.verticalScale),
		sceneZ(model, entity.y)
	])
	const labelled = $derived(LABELLED_KINDS.has(entity.kind))
</script>

<!-- Each kind's model, sized in tiles to roughly its in-game footprint. -->
<T.Group {position} rotation.y={(entity.yaw * Math.PI) / 180} userData={{ entity }}>
	{#if entity.kind === "tower"}
		<Tower {entity} />
	{:else if entity.kind === "barracks"}
		<Barracks {entity} />
	{:else if entity.kind === "ancient"}
		<Ancient {entity} />
	{:else if entity.kind === "fountain"}
		<Fountain {entity} />
	{:else if entity.kind === "shop"}
		<Shop {entity} />
	{:else if entity.kind === "outpost"}
		<Outpost {entity} />
	{:else if entity.kind === "watcher"}
		<Watcher />
	{:else if entity.kind === "wisdom_shrine"}
		<WisdomShrine />
	{:else if entity.kind === "twin_gate"}
		<TwinGate />
	{:else if entity.kind === "lotus_pool"}
		<LotusPool />
	{:else if entity.kind === "neutral_camp"}
		<NeutralCamp {entity} />
	{:else if entity.kind === "rune_power" || entity.kind === "rune_bounty"}
		<Rune {entity} />
	{:else if entity.kind === "roshan"}
		<Roshan />
	{:else if entity.kind === "roshan_pit"}
		<RoshanPit />
	{:else if entity.kind === "tormentor"}
		<Tormentor {entity} />
	{:else if entity.kind === "filler" || entity.kind === "building"}
		<Building {entity} />
	{:else if entity.kind === "lane_spawner"}
		<LaneSpawner {entity} />
	{:else if entity.kind === "neutral_stash"}
		<NeutralStash />
	{:else}
		<Pin {entity} />
	{/if}
</T.Group>

{#if labelled && view.visibility.labels && view.visibility.entities}
	<!-- HTML only applies `pointerEvents` in transform mode: the style keeps its wrapper out of the way. -->
	<HTML
		style="pointer-events: none"
		position={[position[0], position[1] + labelHeight(entity), position[2]]}
	>
		<div class:neutral={entity.team === "neutral" || entity.team === "none"}>
			{entityLabel(entity)}
		</div>
	</HTML>
{/if}

<style>
	/* Bottom-centre on the anchor, above the model. */
	div {
		transform: translate(-50%, -100%);
		pointer-events: none;
		font: 600 12px var(--display);
		letter-spacing: 0.06em;
		white-space: nowrap;
		padding: 1px 6px;
		border-radius: 3px;
		background: rgb(8 12 24 / 0.72);
		border: 1px solid rgb(205 189 140 / 0.45);
		color: var(--fg);
	}
	.neutral {
		color: var(--neutral);
	}
</style>
