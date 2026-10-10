<!--
	Every tree, standing on its corner of the grid: one instanced mesh per species, all sharing a
	flat-shaded vertex-coloured material.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { MeshStandardMaterial } from "three"
	import { placeTrees, SPECIES, type Species } from "#lib/scene/trees.ts"
	import { getViewerState } from "#lib/state.svelte.ts"
	import TreeSpecies from "./TreeSpecies.svelte"

	const view = getViewerState()
	const trees = placeTrees(view.model)
	const species = (Object.keys(SPECIES) as Species[]).map((name) => ({
		name,
		geometry: SPECIES[name](),
		trees: trees.filter((tree) => tree.species === name)
	}))

	const material = new MeshStandardMaterial({
		vertexColors: true,
		roughness: 0.85,
		flatShading: true
	})
</script>

<T.Group name="trees" visible={view.visibility.trees}>
	{#each species as { name, geometry, trees } (name)}
		<TreeSpecies {geometry} {material} {trees} />
	{/each}
</T.Group>
