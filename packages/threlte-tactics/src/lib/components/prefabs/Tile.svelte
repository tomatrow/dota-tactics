<!-- Port of `Prefabs/Tile.prefab`: a unit cube with the Dirt material. -->
<script lang="ts">
	import { T, type Props } from "@threlte/core"
	import type { Mesh } from "three"
	import dirt from "#lib/assets/textures/Dirt.png"
	import { loadTexture } from "#lib/common/textures.ts"
	import { Materials } from "#lib/materials/materials.ts"

	let props: Props<Mesh> = $props()

	const map = await loadTexture(dirt)
</script>

<T.Mesh name="Tile" castShadow receiveShadow {...props}>
	<T.BoxGeometry />
	<T.MeshStandardMaterial {...Materials.Dirt} {map} />
</T.Mesh>
