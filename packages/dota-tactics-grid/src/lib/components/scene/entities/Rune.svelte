<!-- A rune spawn: a bobbing gem over a glowing ring, cyan for power runes, gold for bounty. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import FlatRing from "./FlatRing.svelte"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const colour = $derived(entity.kind === "rune_power" ? 0x5fe0e8 : 0xf2c14e)
</script>

<Part at={[0, 1.4, 0]} bob look={{ colour, glow: true, roughness: 0.3 }}>
	<T.IcosahedronGeometry args={[0.42, 1]} />
</Part>
<FlatRing look={{ colour, glow: true }} radius={0.75} tube={0.06} />
