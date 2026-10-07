<!--
	The `Camera Rig` hierarchy from `Battle.unity`: a rig that moves over the board, a Heading that
	turns it 45° about Y, a Pitch that tilts it down by the isometric angle, and an orthographic
	Main Camera 10 units back.
-->
<script lang="ts">
	import { T, useThrelte } from "@threlte/core"
	import type { Vector3 } from "#lib/common/unity/vector3.ts"

	let { position = [0, 0, 0] }: { position?: Vector3 } = $props()

	/** Unity's `orthographicSize`: half the visible height, in world units. */
	const orthographicSize = 5

	const { size } = useThrelte()
	const { height } = $derived($size)
</script>

<T.Group name="Camera Rig" {position}>
	<T.Group name="Heading" quaternion={[0, 0.38268346, 0, 0.9238795]}>
		<T.Group name="Pitch" quaternion={[0.30290225, 0, 0, 0.95302165]}>
			<!-- Threlte sizes the frustum in pixels, so zoom maps it back to Unity's world units. -->
			<T.OrthographicCamera
				name="Main Camera"
				far={1000}
				makeDefault
				near={0.3}
				position={[0, 0, -10]}
				scale={[1, 1, -1]}
				zoom={height / (2 * orthographicSize)}
			/>
		</T.Group>
	</T.Group>
</T.Group>
