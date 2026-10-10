<!--
	Everything in the 3D view: camera, renderer, lights, the board and what stands on it.
-->
<script lang="ts">
	import { T, useTask, useThrelte } from "@threlte/core"
	import { onDestroy } from "svelte"
	import { Color } from "three"
	import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js"
	import { Entities } from "#lib/scene/entities.ts"
	import { Lanes } from "#lib/scene/lanes.ts"
	import { Trees } from "#lib/scene/trees.ts"
	import { getViewerState } from "#lib/state.svelte.ts"
	import CameraRig from "./CameraRig.svelte"
	import Lighting from "./Lighting.svelte"
	import Picker from "./Picker.svelte"
	import Renderer from "./Renderer.svelte"
	import Terrain from "./Terrain.svelte"
	import TileCursor from "./TileCursor.svelte"
	import Water from "./Water.svelte"

	/**
	 * An instance rather than `<T.Color>`: Threlte recognises classes by their source starting
	 * "class ", and minified base classes start "class{".
	 */
	const background = new Color(0x0b101c)

	const view = getViewerState()
	const { model } = view
	const { scene, camera, dom, size, renderStage } = useThrelte()

	const initialScale = view.verticalScale
	const trees = new Trees(model, initialScale)
	const entities = new Entities(model, initialScale)
	const lanes = new Lanes(model, initialScale)

	$effect(() => {
		const scale = view.verticalScale
		trees.setVerticalScale(scale)
		entities.setVerticalScale(scale)
		lanes.setVerticalScale(scale)
	})

	const labelRenderer = new CSS2DRenderer()
	labelRenderer.domElement.className = "labels"
	dom.append(labelRenderer.domElement)

	$effect(() => {
		const { width, height } = $size
		lanes.setResolution(width, height)
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

	onDestroy(() => {
		trees.dispose()
		entities.dispose()
		lanes.dispose()
		labelRenderer.domElement.remove()
	})
</script>

<CameraRig />
<Renderer />
<Picker entities={[entities.major, entities.minor]} />

<T attach="background" is={background} />
<Lighting />

<T.Group name="ground" scale.y={view.verticalScale}>
	<Terrain />
	<Water />
</T.Group>
<T is={trees.group} visible={view.visibility.trees} />
<T is={entities.major} visible={view.visibility.entities} />
<T is={entities.minor} visible={view.visibility.entities && view.visibility.allMarkers} />
<T is={entities.labels} />
<T is={lanes.group} visible={view.visibility.lanes} />

<TileCursor colour={0xffe39a} opacity={0.4} selection={view.hover} />
<TileCursor colour={0x9fe3ff} opacity={0.3} selection={view.pinned} />
