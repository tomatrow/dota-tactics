<!--
	Port of `View Model Component/CameraRig.cs` and the `Camera Rig` hierarchy from `Battle.unity`:
	a rig that eases towards whatever it follows, a Heading that turns it 45° about Y, a Pitch that
	tilts it down by the isometric angle, and an orthographic Main Camera 10 units back.
-->
<script lang="ts">
	import { T, useTask, useThrelte } from "@threlte/core"
	import { Group, Vector3 as ThreeVector3 } from "three"
	import type { Vector3 } from "#lib/common/unity/vector3.ts"

	let {
		follow,
		speed = 3
	}: {
		/** The position to follow (Unity follows a `Transform`). */
		follow?: Vector3
		/** A smoothing rate rather than a speed: the fraction of the distance covered per second. */
		speed?: number
	} = $props()

	/** Unity's `orthographicSize`: half the visible height, in world units. */
	const orthographicSize = 5

	/**
	 * Unity lerps towards the target forever. Snap once the rest of the way is far below a pixel,
	 * so that on-demand rendering can go idle.
	 */
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
</T>
