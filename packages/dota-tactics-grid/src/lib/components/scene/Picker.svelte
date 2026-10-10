<!--
	What's under the pointer: the nearest entity model, else the tile column the ray meets. Hover
	updates `view.hover`; a click (not a drag) pins. The terrain is never ray-cast: the ray walks the
	grid column by column instead.
-->
<script lang="ts">
	import { useStage, useTask, useThrelte } from "@threlte/core"
	import { on } from "svelte/events"
	import { Matrix4, Raycaster, Vector2, type Object3D } from "three"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { floorHeight, sceneY } from "#lib/scene/coords.ts"
	import { pickColumn } from "#lib/scene/picking.ts"
	import { sameSelection, type Selection } from "#lib/selection.ts"
	import { getViewerState } from "#lib/state.svelte.ts"

	/** How far (CSS px) the pointer may move between press and release for it to be a click. */
	const CLICK_SLOP = 6
	/** How far behind the tile an entity's surface may be and still win: models overhang tiles. */
	const ENTITY_SLACK = 0.75

	let {
		entities
	}: {
		/** Groups of entity models to pick from; hidden ones are skipped. */
		entities: Object3D[]
	} = $props()

	const view = getViewerState()
	const { model } = view
	const { camera, canvas, mainStage, renderStage } = useThrelte()
	/** Picking sees the camera after the controls have moved it this frame, before drawing. */
	const pickStage = useStage("picking", { after: mainStage, before: renderStage })

	const raycaster = new Raycaster()
	const pointer = new Vector2()
	let pointerInside = false
	let pickPending = false
	let downAt: [number, number] | null = null
	const lastView = new Matrix4()
	const lastProjection = new Matrix4()

	function pick(): Selection | null {
		raycaster.setFromCamera(pointer, camera.current)
		const { origin, direction } = raycaster.ray
		const toScene = (h: number) => sceneY(model, h, view.verticalScale)
		const hit = pickColumn(
			origin,
			direction,
			model.cols,
			model.rows,
			(col, row) => toScene(model.height[model.index(col, row)]),
			toScene(floorHeight(model)),
			toScene(model.maxHeight) + 0.01
		)
		const limit = (hit?.t ?? Infinity) + ENTITY_SLACK
		const targets = entities.filter((group) => group.visible)
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

	function hover(selection: Selection | null) {
		if (!sameSelection(selection, view.hover)) view.hover = selection
	}

	function point(event: PointerEvent) {
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
			on(canvas, "pointermove", point),
			on(canvas, "pointerdown", (event) => (downAt = [event.clientX, event.clientY])),
			on(canvas, "pointerup", (event) => {
				if (!downAt || event.button !== 0) return
				const moved = Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1])
				downAt = null
				if (moved > CLICK_SLOP) return
				point(event)
				view.click(pick())
			}),
			on(canvas, "pointerleave", () => {
				pointerInside = false
				downAt = null
				hover(null)
			})
		]
		return () => stops.forEach((stop) => stop())
	})

	// Re-pick when what's under a still pointer may have changed.
	$effect(() => {
		void $state.snapshot(view.visibility)
		void view.verticalScale
		pickPending = true
	})

	useTask(
		() => {
			camera.current.updateMatrixWorld()
			const { matrixWorld, projectionMatrix } = camera.current
			if (!lastView.equals(matrixWorld) || !lastProjection.equals(projectionMatrix)) {
				lastView.copy(matrixWorld)
				lastProjection.copy(projectionMatrix)
				pickPending = true
			}
			if (pickPending && pointerInside) {
				pickPending = false
				hover(pick())
			}
		},
		{ stage: pickStage, autoInvalidate: false }
	)
</script>
