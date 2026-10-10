<!--
	The game's orthographic camera, with Dota's controls: the wheel zooms, middle-drag pans, the
	pointer at the screen's edge pans, and the camera follows the focus while Space is held. The left
	and right buttons are free for the game. It looks down at a fixed angle and only turns in
	quarter turns (`[` / `]`, handled by the game's keys).
-->
<script lang="ts">
	import { T, useTask, useThrelte } from "@threlte/core"
	import { CameraControls, CameraControlsRef } from "@threlte/extras"
	import { on } from "svelte/events"
	import { Vector3, type OrthographicCamera } from "three"
	import { frustum } from "dota-tactics-grid/scene/camera.ts"
	import {
		CAMERA_OFFSET,
		CAMERA_POLAR,
		EDGE_PAN_RATE,
		edgeDirection,
		GAME_ZOOM,
		groundAxes
	} from "#lib/game/camera.ts"
	import { getGameState } from "#lib/game/GameState.svelte.ts"

	const game = getGameState()
	const { view } = game
	const { size } = useThrelte()

	let camera = $state.raw<OrthographicCamera>()

	// A manual camera: its frustum is in tiles, not pixels, so zoom means the same on any screen.
	$effect(() => {
		if (!camera) return
		const { halfWidth, halfHeight } = frustum(Math.max(1, $size.width), Math.max(1, $size.height))
		camera.left = -halfWidth
		camera.right = halfWidth
		camera.top = halfHeight
		camera.bottom = -halfHeight
		camera.updateProjectionMatrix()
	})

	/** Where the pointer is (CSS px), for edge panning; null while it's outside the window. */
	let pointer: [number, number] | null = null

	$effect(() => {
		const stops = [
			on(window, "pointermove", (event) => (pointer = [event.clientX, event.clientY])),
			on(document.documentElement, "pointerleave", () => (pointer = null)),
			on(window, "blur", () => (pointer = null))
		]
		return () => stops.forEach((stop) => stop())
	})

	const target = new Vector3()

	useTask((delta) => {
		const controls = view.controls
		if (!controls || !camera) return
		if (game.following) {
			void controls.moveTo(...game.focus, false)
			return
		}
		if (!pointer) return
		const [dx, dy] = edgeDirection(...pointer, window.innerWidth, window.innerHeight)
		if (dx === 0 && dy === 0) return
		// A screen-height of view, in tiles; ground seen at an angle is longer up the screen.
		const screen = (camera.top - camera.bottom) / camera.zoom
		const across = EDGE_PAN_RATE * screen * delta
		const along = across / Math.cos(CAMERA_POLAR)
		const { right, forward } = groundAxes(controls.azimuthAngle)
		controls.getTarget(target)
		void controls.moveTo(
			target.x + right[0] * dx * across + forward[0] * dy * along,
			target.y,
			target.z + right[1] * dx * across + forward[1] * dy * along,
			false
		)
	})
</script>

<T.OrthographicCamera
	far={4000}
	makeDefault
	manual
	near={1}
	position={CAMERA_OFFSET}
	bind:ref={camera}
>
	<CameraControls
		dollySpeed={0.15}
		draggingSmoothTime={0.08}
		maxPolarAngle={CAMERA_POLAR}
		maxZoom={45}
		minPolarAngle={CAMERA_POLAR}
		minZoom={0.6}
		oncreate={(controls) => {
			const { ACTION } = CameraControlsRef
			controls.mouseButtons.left = ACTION.NONE
			controls.mouseButtons.right = ACTION.NONE
			// Slides along the ground: vertical drags move forward, not up the camera's tilted Y.
			controls.mouseButtons.middle = ACTION.SCREEN_PAN
			controls.mouseButtons.wheel = ACTION.ZOOM
			const [x, y, z] = game.focus
			void controls.setLookAt(
				x + CAMERA_OFFSET[0],
				y + CAMERA_OFFSET[1],
				z + CAMERA_OFFSET[2],
				x,
				y,
				z,
				false
			)
			void controls.zoomTo(GAME_ZOOM, false)
		}}
		smoothTime={0.18}
		bind:ref={view.controls}
	/>
</T.OrthographicCamera>
