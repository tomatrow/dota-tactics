<!--
	Each team's creep paths as screen-width lines over the ground, keeping to the team's right so
	both directions of a lane show.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { MeshLineGeometry, MeshLineMaterial } from "@threlte/extras"
	import { laneSamples } from "#lib/scene/lanes.ts"
	import { TEAM_COLOURS } from "#lib/scene/models.ts"
	import { getViewerState } from "#lib/state.svelte.ts"

	const view = getViewerState()
	const { model } = view
</script>

<T.Group name="lanes" visible={view.visibility.lanes}>
	{#each model.data.lanes as lane, i (i)}
		<T.Mesh name="{lane.team}-{lane.lane}">
			<MeshLineGeometry points={laneSamples(model, lane, view.verticalScale)} />
			<MeshLineMaterial
				attenuate={false}
				color={TEAM_COLOURS[lane.team]}
				opacity={0.9}
				transparent
				width={3}
			/>
		</T.Mesh>
	{/each}
</T.Group>
