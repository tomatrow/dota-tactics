<!--
	Everything in the 3D view: camera, renderer, lights, the board and what stands on it.
-->
<script lang="ts">
	import { isInstanceOf, T, useTask, useThrelte } from "@threlte/core"
	import { onDestroy } from "svelte"
	import { on } from "svelte/events"
	import {
		Color,
		DirectionalLight,
		HemisphereLight,
		Matrix4,
		PMREMGenerator,
		Raycaster,
		Vector2,
		type Object3D
	} from "three"
	import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
	import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { frustum } from "#lib/scene/camera.ts"
	import { floorHeight, sceneY, tileX, tileZ } from "#lib/scene/coords.ts"
	import { TileCursor } from "#lib/scene/cursor.ts"
	import { Entities } from "#lib/scene/entities.ts"
	import { Lanes } from "#lib/scene/lanes.ts"
	import { pickColumn } from "#lib/scene/picking.ts"
	import { Terrain } from "#lib/scene/terrain.ts"
	import { Trees } from "#lib/scene/trees.ts"
	import { Water } from "#lib/scene/water.ts"
	import { sameSelection, type Selection } from "#lib/selection.ts"
	import { getViewerState } from "#lib/state.svelte.ts"
	import CameraRig from "./CameraRig.svelte"
	import Renderer from "./Renderer.svelte"

	/** Tile edge lines fade in between these on-screen tile sizes (CSS px). */
	const GRID_FADE: [number, number] = [6, 16]
	const GRID_OPACITY = 0.38
	const CLICK_SLOP = 6

	const smoothstep = (a: number, b: number, x: number) => {
		const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
		return t * t * (3 - 2 * t)
	}

	const view = getViewerState()
	const { model } = view
	const { renderer, scene, camera, canvas, dom, size, renderStage } = useThrelte()

	scene.background = new Color(0x0b101c)
	const pmrem = new PMREMGenerator(renderer)
	scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
	scene.environmentIntensity = 0.22
	pmrem.dispose()
	const sky = new HemisphereLight(0xd6e2ff, 0x3a3222, 0.75)
	const sun = new DirectionalLight(0xfff0d8, 3.4)
	// From the west and high: shadows fall east, to the right of things from the home view.
	sun.position.set(-260, 380, 60)
	sun.castShadow = true
	sun.shadow.mapSize.set(4096, 4096)
	const extent = 240
	Object.assign(sun.shadow.camera, {
		left: -extent,
		right: extent,
		top: extent,
		bottom: -extent,
		near: 50,
		far: 1100
	})
	sun.shadow.camera.updateProjectionMatrix()
	sun.shadow.bias = -0.0004
	sun.shadow.normalBias = 0.06
	sun.shadow.radius = 2.5

	const initialScale = view.verticalScale
	const terrain = new Terrain(model)
	const water = new Water(model)
	const trees = new Trees(model, initialScale)
	const entities = new Entities(model, initialScale)
	const lanes = new Lanes(model, initialScale)
	const hoverCursor = new TileCursor(0xffe39a, 0.4)
	const pinCursor = new TileCursor(0x9fe3ff, 0.3)

	$effect(() => terrain.paint(view.look))

	$effect(() => {
		const scale = view.verticalScale
		trees.setVerticalScale(scale)
		entities.setVerticalScale(scale)
		lanes.setVerticalScale(scale)
	})

	function placeCursor(cursor: TileCursor, selection: Selection | null, verticalScale: number) {
		if (!selection || !model.inside(selection.col, selection.row)) return cursor.place(null)
		const h = model.height[model.index(selection.col, selection.row)]
		if (Number.isNaN(h)) return cursor.place(null)
		cursor.place(
			tileX(model, selection.col),
			sceneY(model, h, verticalScale),
			tileZ(model, selection.row)
		)
	}
	$effect(() => placeCursor(hoverCursor, view.hover, view.verticalScale))
	$effect(() => placeCursor(pinCursor, view.pinned, view.verticalScale))

	const labelRenderer = new CSS2DRenderer()
	labelRenderer.domElement.className = "labels"
	dom.append(labelRenderer.domElement)

	$effect(() => {
		const { width, height } = $size
		lanes.setResolution(width, height)
		hoverCursor.setResolution(width, height)
		pinCursor.setResolution(width, height)
		labelRenderer.setSize(width, height)
	})

	$effect(() => {
		labelRenderer.domElement.hidden = !(view.visibility.labels && view.visibility.entities)
	})

	let elapsed = 0
	useTask((delta) => {
		elapsed += delta
		const { halfHeight } = frustum(Math.max(1, $size.width), Math.max(1, $size.height))
		const zoom = isInstanceOf(camera.current, "OrthographicCamera") ? camera.current.zoom : 1
		const tilePixels = ($size.height / (2 * halfHeight)) * zoom
		terrain.setGridOpacity(
			view.visibility.grid ? GRID_OPACITY * smoothstep(GRID_FADE[0], GRID_FADE[1], tilePixels) : 0
		)
		water.animate(elapsed)
		entities.animate(elapsed, Math.min(0.1, delta))
	})

	useTask(() => labelRenderer.render(scene, camera.current), {
		stage: renderStage,
		autoInvalidate: false
	})

	// Picking: what's under the pointer, re-picked when the pointer or the camera moves.
	const raycaster = new Raycaster()
	const pointer = new Vector2()
	let pointerInside = false
	let pickPending = false
	let downAt: [number, number] | null = null
	const lastView = new Matrix4()
	const lastProjection = new Matrix4()

	/** What's under the pointer: the nearest entity model, else the tile column the ray meets. */
	function pick(): Selection | null {
		const scale = view.verticalScale
		raycaster.setFromCamera(pointer, camera.current)
		const { origin, direction } = raycaster.ray
		const toScene = (h: number) => sceneY(model, h, scale)
		const hit = pickColumn(
			origin,
			direction,
			model.cols,
			model.rows,
			(col, row) => toScene(model.height[model.index(col, row)]),
			toScene(floorHeight(model)),
			toScene(model.maxHeight) + 0.01
		)
		const targets: Object3D[] = []
		if (view.visibility.entities) {
			targets.push(entities.major)
			if (view.visibility.allMarkers) targets.push(entities.minor)
		}
		const limit = (hit?.t ?? Infinity) + 0.75
		for (const h of raycaster.intersectObjects(targets, true)) {
			if (h.distance > limit) break
			let o: Object3D | null = h.object
			while (o && !o.userData.entity) o = o.parent
			const entity = o?.userData.entity as MapEntity | undefined
			if (entity) {
				const cell = model.cellOf(entity.x, entity.y)
				return { kind: "entity", entity, col: cell?.[0] ?? -1, row: cell?.[1] ?? -1 }
			}
		}
		return hit ? { kind: "tile", col: hit.col, row: hit.row } : null
	}

	function setHover(selection: Selection | null) {
		if (!sameSelection(selection, view.hover)) view.hover = selection
	}

	function onpointermove(event: PointerEvent) {
		const rect = canvas.getBoundingClientRect()
		pointer.set(
			((event.clientX - rect.left) / rect.width) * 2 - 1,
			-((event.clientY - rect.top) / rect.height) * 2 + 1
		)
		pointerInside = true
		pickPending = true
	}

	$effect(() => {
		const stops = [
			on(canvas, "pointermove", onpointermove),
			on(canvas, "pointerdown", (event) => (downAt = [event.clientX, event.clientY])),
			on(canvas, "pointerup", (event) => {
				if (!downAt || event.button !== 0) return
				const moved = Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1])
				downAt = null
				if (moved > CLICK_SLOP) return
				onpointermove(event)
				view.click(pick())
			}),
			on(canvas, "pointerleave", () => {
				pointerInside = false
				downAt = null
				setHover(null)
			})
		]
		return () => stops.forEach((stop) => stop())
	})

	// Re-pick when anything that changes the answer changes.
	$effect(() => {
		void $state.snapshot(view.visibility)
		void view.verticalScale
		pickPending = true
	})

	useTask(() => {
		const { matrixWorld, projectionMatrix } = camera.current
		if (!lastView.equals(matrixWorld) || !lastProjection.equals(projectionMatrix)) {
			lastView.copy(matrixWorld)
			lastProjection.copy(projectionMatrix)
			pickPending = true
		}
		if (pickPending && pointerInside) {
			pickPending = false
			setHover(pick())
		}
	})

	onDestroy(() => {
		terrain.dispose()
		water.dispose()
		trees.dispose()
		entities.dispose()
		lanes.dispose()
		hoverCursor.dispose()
		pinCursor.dispose()
		scene.environment?.dispose()
		sun.shadow.dispose()
		labelRenderer.domElement.remove()
	})
</script>

<CameraRig />
<Renderer />

<T is={sky} />
<T is={sun} />

<T.Group scale.y={view.verticalScale}>
	<T is={terrain.mesh} />
	<T is={water.mesh} visible={view.layer === "terrain"} />
</T.Group>
<T is={trees.group} visible={view.visibility.trees} />
<T is={entities.major} visible={view.visibility.entities} />
<T is={entities.minor} visible={view.visibility.entities && view.visibility.allMarkers} />
<T is={entities.labels} />
<T is={lanes.group} visible={view.visibility.lanes} />
<T is={hoverCursor.group} />
<T is={pinCursor.group} />
