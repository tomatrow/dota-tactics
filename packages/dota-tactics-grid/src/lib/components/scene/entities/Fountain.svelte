<!-- A fountain: a round stone basin of glowing water around a spire with a floating crystal. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { STONE, TEAM_COLOURS, WATER } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const team = $derived(TEAM_COLOURS[entity.team])
	const stone = $derived(STONE[entity.team])
</script>

<Part at={[0, 0.4, 0]} look={stone}><T.CylinderGeometry args={[3.6, 4.0, 0.8, 12]} /></Part>
<Part at={[0, 0.82, 0]} look={{ colour: WATER, glow: true, roughness: 0.2 }}>
	<T.CylinderGeometry args={[3.1, 3.1, 0.12, 24]} />
</Part>
<Part at={[0, 2.4, 0]} look={stone}><T.CylinderGeometry args={[0.3, 0.55, 3.2, 6]} /></Part>
<Part at={[0, 4.6, 0]} bob look={{ colour: team, glow: true }} spin={0.8}>
	<T.OctahedronGeometry args={[0.6]} />
</Part>
