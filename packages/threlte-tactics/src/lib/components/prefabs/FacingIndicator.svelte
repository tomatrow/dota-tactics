<!--
	Port of `Prefabs/Tile Selection Indicator.prefab`'s `Facing Indicator` child: four small spheres
	over the tile, one per direction; the one at `selected` is highlighted.
-->
<script lang="ts">
	import { T, type Props } from "@threlte/core"
	import type { Group } from "three"
	import type { Directions } from "#lib/enums/Directions.ts"
	import { Materials } from "#lib/materials/materials.ts"

	let {
		selected = null,
		...props
	}: Props<Group> & {
		/** The highlighted sphere's direction (Unity: `FacingIndicator.SetDirection`). */
		selected?: Directions | null
	} = $props()

	// By `Directions`: north (+z), east, south, west.
	const spheres: [number, number, number][] = [
		[0, 0.6, 0.3],
		[0.3, 0.6, 0],
		[0, 0.6, -0.3],
		[-0.3, 0.6, 0]
	]
</script>

<T.Group name="Facing Indicator" {...props}>
	{#each spheres as position, i (i)}
		<T.Mesh name="Sphere ({i})" castShadow {position} scale={0.25}>
			<T.SphereGeometry args={[0.5, 32, 16]} />
			<T.MeshStandardMaterial {...i === selected ? Materials.Selection : Materials.Default} />
		</T.Mesh>
	{/each}
</T.Group>
