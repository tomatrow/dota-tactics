<!--
	Everything in the 3D view: camera, renderer, lights, the board and what stands on it.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { onDestroy } from "svelte"
	import { Color, type Group } from "three"
	import { Trees } from "#lib/scene/trees.ts"
	import { getViewerState } from "#lib/state.svelte.ts"
	import CameraRig from "./CameraRig.svelte"
	import Entities from "./entities/Entities.svelte"
	import Lanes from "./Lanes.svelte"
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
	const trees = new Trees(model, view.verticalScale)
	$effect(() => trees.setVerticalScale(view.verticalScale))
	onDestroy(() => trees.dispose())

	let entities = $state.raw<Group>()
	let markers = $state.raw<Group>()
</script>

<CameraRig />
<Renderer />
<Picker entities={[entities, markers].filter((group) => group !== undefined)} />

<T attach="background" is={background} />
<Lighting />

<T.Group name="ground" scale.y={view.verticalScale}>
	<Terrain />
	<Water />
</T.Group>
<T is={trees.group} visible={view.visibility.trees} />
<Entities bind:major={entities} bind:minor={markers} />
<Lanes />

<TileCursor colour={0xffe39a} opacity={0.4} selection={view.hover} />
<TileCursor colour={0x9fe3ff} opacity={0.3} selection={view.pinned} />
