<!--
	The mouse on the board: what's under the pointer (a unit by where its body is on screen, else a
	Sentinel's tower from the board's picker) and, while a tile ability waits for its target, where
	it would land; right-clicks (commands) and left-clicks (targets, selection). A click finds its tile itself, as the board's picker does: the picker only looks
	once a frame, and a click can come in the same frame as the move before it.
-->
<script lang="ts">
	import { useStage, useTask, useThrelte } from "@threlte/core"
	import { on } from "svelte/events"
	import { OrthographicCamera, Raycaster, Vector2, Vector3 } from "three"
	import { floorHeight, sceneY } from "dota-tactics-grid/scene/coords.ts"
	import { pickColumn } from "dota-tactics-grid/scene/picking.ts"
	import { getGameState } from "#lib/game/GameState.svelte.ts"
	import { bodyHeight, pickRadius } from "#lib/game/units.ts"
	import type { Unit } from "#lib/sim/unit.ts"

	/** How far (CSS px) the pointer may move between press and release for it to be a click. */
	const CLICK_SLOP = 6
	/** However far out the camera is, a unit is this easy (CSS px) to pick. */
	const MIN_PICK = 14

	const game = getGameState()
	const { view } = game
	const { camera, canvas, mainStage, renderStage } = useThrelte()
	/** Picks with the camera where the controls left it this frame, before drawing. */
	const inputStage = useStage("game-input", { after: mainStage, before: renderStage })

	/** The pointer, in CSS px from the canvas's top left; null while it's off the canvas. */
	let pointer: [number, number] | null = null
	let downAt: [number, number] | null = null
	const at = new Vector3()
	const raycaster = new Raycaster()
	const ndc = new Vector2()

	/** The unit whose body is nearest the pointer on screen, within its pick radius. */
	function unitAt(x: number, y: number): Unit | null {
		const cam = camera.current
		const { width, height } = canvas.getBoundingClientRect()
		// An orthographic view: the same px per tile everywhere on screen.
		const pxPerTile =
			cam instanceof OrthographicCamera ? (height * cam.zoom) / (cam.top - cam.bottom) : 30
		let best: Unit | null = null
		let bestDistance = Infinity
		for (const unit of game.world.units) {
			if (unit.stats.structure) continue
			const [px, py, pz] = game.position(unit)
			at.set(px, py + bodyHeight(unit.stats), pz).project(cam)
			const d = Math.hypot(((at.x + 1) / 2) * width - x, ((1 - at.y) / 2) * height - y)
			const radius = Math.max(MIN_PICK, pickRadius(unit.stats) * pxPerTile)
			if (d < radius && d < bestDistance) {
				best = unit
				bestDistance = d
			}
		}
		return best
	}

	/** The Sentinel whose tower the board's picker has under the pointer. */
	function sentinel(): Unit | null {
		const hover = view.hover
		if (hover?.kind !== "entity") return null
		return game.world.units.find((u) => u.entity === hover.entity.name) ?? null
	}

	const under = (): Unit | null => (pointer ? (unitAt(...pointer) ?? sentinel()) : null)

	/** The tile whose column the pointer's ray meets first. */
	function tile(): [number, number] | null {
		if (!pointer) return null
		const { model } = game
		const { width, height } = canvas.getBoundingClientRect()
		ndc.set((pointer[0] / width) * 2 - 1, -(pointer[1] / height) * 2 + 1)
		raycaster.setFromCamera(ndc, camera.current)
		const toScene = (h: number) => sceneY(model, h, view.verticalScale)
		const hit = pickColumn(
			raycaster.ray.origin,
			raycaster.ray.direction,
			model.cols,
			model.rows,
			(col, row) => toScene(model.height[model.index(col, row)]),
			toScene(floorHeight(model)),
			toScene(model.maxHeight) + 0.01
		)
		return hit ? [hit.col, hit.row] : null
	}

	function point(event: PointerEvent) {
		const rect = canvas.getBoundingClientRect()
		pointer = [event.clientX - rect.left, event.clientY - rect.top]
	}

	$effect(() => {
		const stops = [
			on(canvas, "pointermove", point),
			on(canvas, "pointerleave", () => {
				pointer = null
				downAt = null
				game.hovered = null
			}),
			on(canvas, "pointerdown", (event) => {
				point(event)
				if (event.button === 2) game.rightClick(under(), tile())
				else if (event.button === 0) downAt = [event.clientX, event.clientY]
			}),
			on(canvas, "pointerup", (event) => {
				if (event.button !== 0 || !downAt) return
				const moved = Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1])
				downAt = null
				if (moved > CLICK_SLOP) return
				point(event)
				game.leftClick(under(), tile())
			})
		]
		return () => stops.forEach((stop) => stop())
	})

	// A crosshair while a click will pick a target.
	$effect(() => {
		canvas.style.cursor = game.targeting ? "crosshair" : ""
		return () => (canvas.style.cursor = "")
	})

	useTask(
		() => {
			const unit = under()
			if (unit !== game.hovered) game.hovered = unit
			const targeting = game.targeting
			if (targeting?.kind === "ability" && targeting.ability.target === "tile") {
				const enemy = unit && game.canTarget(targeting.ability, unit)
				game.aim = enemy ? game.world.tileOf(unit) : tile()
			}
		},
		{ stage: inputStage, autoInvalidate: false }
	)
</script>
