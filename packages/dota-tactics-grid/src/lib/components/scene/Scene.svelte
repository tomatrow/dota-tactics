<!--
	Everything in the 3D view: camera, renderer, lights, the board and what stands on it.
-->
<script lang="ts">
	import { T, useTask, useThrelte } from "@threlte/core"
	import { onDestroy } from "svelte"
	import { on } from "svelte/events"
	import { Color, Matrix4, Raycaster, Vector2, type Object3D } from "three"
	import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { floorHeight, sceneY, tileX, tileZ } from "#lib/scene/coords.ts"
	import { TileCursor } from "#lib/scene/cursor.ts"
	import { Entities } from "#lib/scene/entities.ts"
	import { Lanes } from "#lib/scene/lanes.ts"
	import { pickColumn } from "#lib/scene/picking.ts"
	import { Trees } from "#lib/scene/trees.ts"
	import { sameSelection, type Selection } from "#lib/selection.ts"
	import { getViewerState } from "#lib/state.svelte.ts"
	import CameraRig from "./CameraRig.svelte"
	import Lighting from "./Lighting.svelte"
	import Renderer from "./Renderer.svelte"
	import Terrain from "./Terrain.svelte"
	import Water from "./Water.svelte"

	const CLICK_SLOP = 6

	/**
	 * An instance rather than `<T.Color>`: Threlte recognises classes by their source starting
	 * "class ", and minified base classes start "class{".
	 */
	const background = new Color(0x0b101c)

	const view = getViewerState()
	const { model } = view
	const { scene, camera, canvas, dom, size, renderStage } = useThrelte()

	const initialScale = view.verticalScale
	const trees = new Trees(model, initialScale)
	const entities = new Entities(model, initialScale)
	const lanes = new Lanes(model, initialScale)
	const hoverCursor = new TileCursor(0xffe39a, 0.4)
	const pinCursor = new TileCursor(0x9fe3ff, 0.3)

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
		trees.dispose()
		entities.dispose()
		lanes.dispose()
		hoverCursor.dispose()
		pinCursor.dispose()
		labelRenderer.domElement.remove()
	})
</script>

<CameraRig />
<Renderer />

<T attach="background" is={background} />
<Lighting />

<T.Group scale.y={view.verticalScale}>
	<Terrain />
	<Water />
</T.Group>
<T is={trees.group} visible={view.visibility.trees} />
<T is={entities.major} visible={view.visibility.entities} />
<T is={entities.minor} visible={view.visibility.entities && view.visibility.allMarkers} />
<T is={entities.labels} />
<T is={lanes.group} visible={view.visibility.lanes} />
<T is={hoverCursor.group} />
<T is={pinCursor.group} />
