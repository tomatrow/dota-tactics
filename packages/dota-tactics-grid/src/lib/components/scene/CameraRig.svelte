<!--
	The orthographic camera and its controls: drag to orbit, right-drag to pan, scroll to zoom
	towards the cursor. At zoom 1 the whole board fits, whatever the viewport's shape.
-->
<script lang="ts">
	import { T, useThrelte } from "@threlte/core"
	import { CameraControls } from "@threlte/extras"
	import type { OrthographicCamera } from "three"
	import { frustum, HOME_POSITION, HOME_TARGET } from "#lib/scene/camera.ts"
	import { getViewerState } from "#lib/state.svelte.ts"

	const view = getViewerState()
	const { size } = useThrelte()

	let camera = $state.raw<OrthographicCamera>()

	// A manual camera: its frustum is in tiles, not pixels, so zoom 1 always fits the board.
	$effect(() => {
		if (!camera) return
		const { halfWidth, halfHeight } = frustum(Math.max(1, $size.width), Math.max(1, $size.height))
		camera.left = -halfWidth
		camera.right = halfWidth
		camera.top = halfHeight
		camera.bottom = -halfHeight
		camera.updateProjectionMatrix()
	})
</script>

<T.OrthographicCamera
	far={4000}
	makeDefault
	manual
	near={1}
	position={HOME_POSITION}
	bind:ref={camera}
>
	<CameraControls
		dollySpeed={0.1}
		dollyToCursor
		draggingSmoothTime={0.08}
		maxPolarAngle={1.3}
		maxZoom={45}
		minPolarAngle={0.15}
		minZoom={0.6}
		oncreate={(controls) => {
			void controls.setLookAt(...HOME_POSITION, ...HOME_TARGET, false)
		}}
		smoothTime={0.18}
		bind:ref={view.controls}
	/>
</T.OrthographicCamera>
