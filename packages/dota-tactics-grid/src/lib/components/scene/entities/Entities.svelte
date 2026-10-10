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
		minor = $bindable()
	}: {
		/** The major entities' group, for picking. */
		major?: Group
		/** The minor markers' group, for picking. */
		minor?: Group
	} = $props()

	const view = getViewerState()
	const { entities } = view.model.data

	setMaterials(new Materials())
</script>

<T.Group name="entities" visible={view.visibility.entities} bind:ref={major}>
	{#each entities.filter((e) => !isMinor(e)) as entity, i (i)}
		<Entity {entity} />
	{/each}
</T.Group>
<T.Group
	name="minor-markers"
	visible={view.visibility.entities && view.visibility.allMarkers}
	bind:ref={minor}
>
	{#each entities.filter(isMinor) as entity, i (i)}
		<Entity {entity} />
	{/each}
</T.Group>
