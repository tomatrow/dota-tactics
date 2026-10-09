<!--
	Port of `Prefabs/Tile Selection Indicator.prefab`: eight thin yellow bars that read as angle
	brackets around the corners of the selected tile; and the facing indicator, a child that is
	inactive (hidden) unless `facingIndicator` says otherwise.
-->
<script lang="ts">
	import { T, type Props } from "@threlte/core"
	import type { ComponentProps } from "svelte"
	import type { Group } from "three"
	import { Materials } from "#lib/materials/materials.ts"
	import FacingIndicator from "./FacingIndicator.svelte"

	let {
		facingIndicator = { visible: false },
		...props
	}: Props<Group> & {
		/** Props for the `Facing Indicator` child. */
		facingIndicator?: ComponentProps<typeof FacingIndicator>
	} = $props()

	type Vector3 = [number, number, number]

	/** Two bars at each corner, one along X and one along Z, meeting near the corner. */
	const bars: { position: Vector3; scale: Vector3 }[] = [-1, 1].flatMap((x) =>
		[-1, 1].flatMap((z) => [
			{ position: [0.4 * x, 0, 0.5 * z] as Vector3, scale: [0.3, 0.1, 0.1] as Vector3 },
			{ position: [0.5 * x, 0, 0.4 * z] as Vector3, scale: [0.1, 0.1, 0.3] as Vector3 }
		])
	)
</script>

<T.Group name="Tile Selection Indicator" {...props}>
	{#each bars as bar, i (bar)}
		<T.Mesh name="Cube {i}" castShadow position={bar.position} receiveShadow scale={bar.scale}>
			<T.BoxGeometry />
			<T.MeshStandardMaterial {...Materials.Selection} />
		</T.Mesh>
	{/each}
	<FacingIndicator {...facingIndicator} />
</T.Group>
