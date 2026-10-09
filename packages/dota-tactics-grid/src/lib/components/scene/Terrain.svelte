<!--
	The board: every tile as a column at its real height, coloured by the current layer. Tile edge
	lines fade in as you zoom, once tiles are big enough on screen to tell apart.
-->
<script lang="ts">
	import { isInstanceOf, T, useTask, useThrelte } from "@threlte/core"
	import { tilePixels } from "#lib/scene/camera.ts"
	import { paintTerrain, terrainGeometry, terrainMaterial } from "#lib/scene/terrain.ts"
	import { getViewerState } from "#lib/state.svelte.ts"

	/** Tile edge lines fade in between these on-screen tile sizes (CSS px). */
	const GRID_FADE = [6, 16] as const
	const GRID_OPACITY = 0.38

	const smoothstep = (a: number, b: number, x: number) => {
		const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
		return t * t * (3 - 2 * t)
	}

	const view = getViewerState()
	const { model } = view
	const { camera, size } = useThrelte()
	const terrain = terrainGeometry(model)
	const { material, gridOpacity } = terrainMaterial(model)

	$effect(() => paintTerrain(model, terrain, view.look))

	useTask(() => {
		if (!view.visibility.grid) {
			gridOpacity.value = 0
			return
		}
		const zoom = isInstanceOf(camera.current, "OrthographicCamera") ? camera.current.zoom : 1
		const pixels = tilePixels(size.current.width, size.current.height, zoom)
		gridOpacity.value = GRID_OPACITY * smoothstep(...GRID_FADE, pixels)
	})
</script>

<T.Mesh name="terrain" castShadow receiveShadow>
	<T is={terrain.geometry} />
	<T is={material} />
</T.Mesh>
