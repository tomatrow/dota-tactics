<!-- A neutral camp: a tent and a banner inside a ring, sized by the camp. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { DARK, WOOD } from "#lib/scene/palette.ts"
	import FlatRing from "./FlatRing.svelte"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const SIZES: Partial<Record<string, number>> = {
		small: 0.7,
		medium: 0.9,
		large: 1.1,
		ancient: 1.35
	}
	const s = $derived(SIZES[entity.size ?? ""] ?? 0.9)
	const banner = $derived(entity.size === "ancient" ? 0xa0422a : 0xc9a46a)
</script>

<Part at={[0, 0.45 * s, 0]} look={WOOD}><T.ConeGeometry args={[0.7 * s, 0.9 * s, 5]} /></Part>
<Part at={[0.7 * s, 0.8 * s, 0]} look={DARK}>
	<T.CylinderGeometry args={[0.04, 0.04, 1.6 * s, 4]} />
</Part>
<Part at={[0.98 * s, 1.4 * s, 0]} look={banner}>
	<T.BoxGeometry args={[0.55 * s, 0.35 * s, 0.04]} />
</Part>
<FlatRing look={{ colour: 0x8a6a4a }} radius={1.1 * s} tube={0.05} />
