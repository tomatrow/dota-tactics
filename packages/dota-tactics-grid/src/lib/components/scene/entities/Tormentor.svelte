<!-- A Tormentor: a large floating, spinning crystal over a glowing ring. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { TEAM_COLOURS } from "#lib/scene/palette.ts"
	import FlatRing from "./FlatRing.svelte"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const team = $derived(TEAM_COLOURS[entity.team])
</script>

<Part
	at={[0, 2.6, 0]}
	bob
	look={{ colour: team, glow: true, metalness: 0.3, roughness: 0.35 }}
	spin={0.7}
>
	<T.IcosahedronGeometry args={[1.1, 0]} />
</Part>
<FlatRing look={{ colour: team, glow: true }} radius={1.7} tube={0.1} />
