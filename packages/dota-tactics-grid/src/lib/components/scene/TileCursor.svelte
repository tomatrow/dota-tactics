<!--
	The FFT-style tile cursor: a thick outline and a translucent fill on top of the selected tile
	(an entity's own tile when an entity is selected).
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { MeshLineGeometry, MeshLineMaterial } from "@threlte/extras"
	import { Vector3 } from "three"
	import { sceneY, tileX, tileZ } from "#lib/scene/coords.ts"
	import type { Selection } from "#lib/selection.ts"
	import { getViewerState } from "#lib/state.svelte.ts"

	let {
		selection,
		colour,
		opacity
	}: { selection: Selection | null; colour: number; opacity: number } = $props()

	const view = getViewerState()
	const { model } = view

	const outline = [
		[-0.5, -0.5],
		[0.5, -0.5],
		[0.5, 0.5],
		[-0.5, 0.5],
		[-0.5, -0.5]
	].map(([x, z]) => new Vector3(x, 0, z))

	/** The top of the selected tile, or null when there's nothing to put the cursor on. */
	const top = $derived.by((): [number, number, number] | null => {
		if (!selection || !model.inside(selection.col, selection.row)) return null
		const h = model.height[model.index(selection.col, selection.row)]
		if (Number.isNaN(h)) return null
		return [
			tileX(model, selection.col),
			sceneY(model, h, view.verticalScale) + 0.02,
			tileZ(model, selection.row)
		]
	})
</script>

<T.Group name="cursor" position={top ?? [0, 0, 0]} visible={top !== null}>
	<T.Mesh position.y={0.01} renderOrder={9} rotation.x={-Math.PI / 2}>
		<T.PlaneGeometry />
		<T.MeshBasicMaterial
			color={colour}
			depthWrite={false}
			{opacity}
			toneMapped={false}
			transparent
		/>
	</T.Mesh>
	<T.Mesh renderOrder={10}>
		<MeshLineGeometry points={outline} />
		<MeshLineMaterial attenuate={false} color={colour} depthTest={false} transparent width={2.5} />
	</T.Mesh>
</T.Group>
