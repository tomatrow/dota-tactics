<!--
	Every entity in the map as a model: buildings, objectives and camps in one group, and the
	plumbing markers (spawners, stashes, unknown kinds) in another, shown with "All markers".
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { Group } from "three"
	import { isMinor } from "#lib/map/entities.ts"
	import { Materials, setMaterials } from "#lib/scene/palette.ts"
	import { getViewerState } from "#lib/state.svelte.ts"
	import Entity from "./Entity.svelte"

	let {
		major = $bindable(),
		minor = $bindable(),
		hidden = new Set()
	}: {
		/** The major entities' group, for picking. */
		major?: Group
		/** The minor markers' group, for picking. */
		minor?: Group
		/** Names of entities not to draw (a game's destroyed buildings). */
		hidden?: ReadonlySet<string>
	} = $props()

	const view = getViewerState()
	// Keyed by their index in the map, so hiding one doesn't rebuild the others.
	const entities = view.model.data.entities.map((entity, i) => ({ entity, i }))

	setMaterials(new Materials())
</script>

<T.Group name="entities" visible={view.visibility.entities} bind:ref={major}>
	{#each entities.filter(({ entity: e }) => !isMinor(e) && !hidden.has(e.name)) as { entity, i } (i)}
		<Entity {entity} />
	{/each}
</T.Group>
<T.Group
	name="minor-markers"
	visible={view.visibility.entities && view.visibility.allMarkers}
	bind:ref={minor}
>
	{#each entities.filter(({ entity: e }) => isMinor(e) && !hidden.has(e.name)) as { entity, i } (i)}
		<Entity {entity} />
	{/each}
</T.Group>
