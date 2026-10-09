<!--
	A translucent animated surface over every water tile. It's part of the terrain look only: in the
	data layers it would tint the colours.
-->
<script lang="ts">
	import { T, useTask } from "@threlte/core"
	import { rippleTexture, waterGeometry } from "#lib/scene/water.ts"
	import { getViewerState } from "#lib/state.svelte.ts"

	const view = getViewerState()
	const geometry = waterGeometry(view.model)
	const ripples = rippleTexture()

	let elapsed = 0
	useTask((delta) => {
		elapsed += delta
		ripples.offset.set(elapsed * 0.012, elapsed * 0.007)
	})
</script>

<T.Mesh name="water" receiveShadow renderOrder={1} visible={view.layer === "terrain"}>
	<T is={geometry} />
	<T.MeshStandardMaterial
		color={0x2a78b8}
		depthWrite={false}
		emissive={0x0b2440}
		metalness={0}
		normalScale={[0.45, 0.45]}
		opacity={0.66}
		roughness={0.12}
		transparent
	>
		<T attach="normalMap" is={ripples} />
	</T.MeshStandardMaterial>
</T.Mesh>
