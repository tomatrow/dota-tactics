<!-- A shop: a wooden hut whose roof colour tells the kind of shop. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { GOLD, WOOD } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const roof = $derived(
		entity.shop === "secret" ? 0xb27ae8
		: entity.shop === "side" ? 0x5fc6e8
		: GOLD
	)
</script>

<Part at={[0, 0.65, 0]} look={WOOD}><T.BoxGeometry args={[2, 1.3, 2]} /></Part>
<Part at={[0, 1.85, 0]} look={roof} rotate={[0, Math.PI / 4, 0]}>
	<T.ConeGeometry args={[1.7, 1.1, 4]} />
</Part>
