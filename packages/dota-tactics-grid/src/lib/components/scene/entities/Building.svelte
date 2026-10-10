<!-- A filler building: a small stone base and spire with a team-coloured crystal. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { STONE, TEAM_COLOURS } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const team = $derived(TEAM_COLOURS[entity.team])
	const stone = $derived(STONE[entity.team])
</script>

<Part at={[0, 0.25, 0]} look={stone}><T.BoxGeometry args={[1.1, 0.5, 1.1]} /></Part>
<Part at={[0, 1.4, 0]} look={stone} rotate={[0, Math.PI / 4, 0]}>
	<T.ConeGeometry args={[0.5, 1.8, 4]} />
</Part>
<Part at={[0, 2.5, 0]} look={{ colour: team, glow: true }} spin={1}>
	<T.OctahedronGeometry args={[0.2]} />
</Part>
