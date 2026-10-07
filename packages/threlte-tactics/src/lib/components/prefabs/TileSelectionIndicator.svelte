<!--
	Port of `Prefabs/Tile Selection Indicator.prefab`: eight thin yellow bars that read as angle
	brackets around the corners of the selected tile.
-->
<script lang="ts">
	import { T, type Props } from "@threlte/core"
	import type { Group } from "three"
	import { unityEuler } from "#lib/common/unity/euler.ts"
	import { Materials } from "#lib/materials/materials.ts"

	let props: Props<Group> = $props()

	const cubes: { position: [number, number, number]; rotationY: number }[] = [
		{ position: [0.5, 0, 0.4], rotationY: 0 },
		{ position: [0.4, 0, -0.5], rotationY: 90 },
		{ position: [-0.5, 0, -0.4], rotationY: -180 },
		{ position: [-0.4, 0, 0.5], rotationY: -90 },
		{ position: [0.4, 0, 0.5], rotationY: 90 },
		{ position: [0.5, 0, -0.4], rotationY: -180 },
		{ position: [-0.4, 0, -0.5], rotationY: -90 },
		{ position: [-0.5, 0, 0.4], rotationY: 0 }
	]
</script>

<T.Group name="Tile Selection Indicator" {...props}>
	{#each cubes as cube, i (cube)}
		<T.Mesh
			name="Cube {i}"
			castShadow
			position={cube.position}
			receiveShadow
			rotation={unityEuler(0, cube.rotationY, 0)}
			scale={[0.1, 0.1, 0.3]}
		>
			<T.BoxGeometry />
			<T.MeshStandardMaterial {...Materials.Selection} />
		</T.Mesh>
	{/each}
</T.Group>
