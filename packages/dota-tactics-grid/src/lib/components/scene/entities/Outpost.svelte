<!-- An outpost: a stone pillar flying a gold banner, with a spinning crystal on top. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { GOLD, STONE } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const stone = $derived(STONE[entity.team])
</script>

<Part at={[0, 0.3, 0]} look={stone}><T.CylinderGeometry args={[1.6, 1.9, 0.6, 8]} /></Part>
<Part at={[0, 2.4, 0]} look={stone}><T.CylinderGeometry args={[0.45, 0.65, 3.6, 6]} /></Part>
<Part at={[0.75, 3.7, 0]} look={GOLD}><T.BoxGeometry args={[1.4, 0.8, 0.06]} /></Part>
<Part at={[0, 4.6, 0]} look={{ colour: GOLD, glow: true }} spin={1}>
	<T.OctahedronGeometry args={[0.35]} />
</Part>
