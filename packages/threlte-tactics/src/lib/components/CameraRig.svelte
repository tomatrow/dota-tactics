<!--
	Port of `View Model Component/CameraRig.cs` and the `Camera Rig` hierarchy from `Battle.unity`:
	a rig that eases towards whatever it follows, a Heading that turns it to look north-east, a Pitch
	that tilts it down by the isometric angle, and an orthographic Main Camera 10 units back.
-->
<script lang="ts">
	import { T, useTask, useThrelte } from "@threlte/core"
	import { Group, Vector3 as ThreeVector3 } from "three"
	import type { Vector3 } from "#lib/common/vector.ts"

	let {
		follow,
		speed = 3
	}: {
		/** The position to follow. */
		follow?: Vector3
		/** A smoothing rate rather than a speed: the fraction of the distance covered per second. */
		speed?: number
	} = $props()

	/** Half the visible height, in world units. */
	const orthographicSize = 5

	/** The isometric angle: looking down a cube's diagonal. */
	const isometricPitch = Math.atan(Math.SQRT1_2)

	/** Snap once the rest of the way is far below a pixel, so on-demand rendering can go idle. */
	const settledDistanceSq = 1e-8

	const { size, invalidate } = useThrelte()
	const { height } = $derived($size)

	const rig = new Group()
	const target = new ThreeVector3()

	useTask(
		(delta) => {
			if (!follow) return
			target.set(...follow)
			if (rig.position.equals(target)) return

			if (rig.position.distanceToSquared(target) < settledDistanceSq) {
				rig.position.copy(target)
			} else {
				rig.position.lerp(target, Math.min(speed * delta, 1))
			}
			invalidate()
		},
		{ autoInvalidate: false }
	)
</script>

<T name="Camera Rig" is={rig}>
	<T.Group name="Heading" rotation.y={-Math.PI / 4}>
		<T.Group name="Pitch" rotation.x={-isometricPitch}>
			<!-- Threlte sizes the frustum in pixels, so zoom maps it back to world units. -->
			<T.OrthographicCamera
				name="Main Camera"
				far={1000}
				makeDefault
				near={0.3}
				position={[0, 0, 10]}
				zoom={height / (2 * orthographicSize)}
			/>
		</T.Group>
	</T.Group>
</T>
