<!-- A tower: a stone column on a plinth, a team-coloured cap and a floating crystal. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { STONE, TEAM_COLOURS } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const team = $derived(TEAM_COLOURS[entity.team])
	const stone = $derived(STONE[entity.team])
	/** Higher tiers stand taller. */
	const body = $derived(3.2 * (0.85 + 0.1 * (entity.tier ?? 1)))
</script>

<Part at={[0, 0.225, 0]} look={stone}><T.CylinderGeometry args={[1.25, 1.45, 0.45, 6]} /></Part>
<Part at={[0, 0.45 + body / 2, 0]} look={stone}>
	<T.CylinderGeometry args={[0.7, 0.95, body, 6]} />
</Part>
<Part at={[0, 0.45 + body, 0]} look={team}><T.CylinderGeometry args={[1.0, 1.0, 0.25, 6]} /></Part>
<Part at={[0, 1.15 + body, 0]} look={{ colour: team, glow: true }}>
	<T.ConeGeometry args={[0.9, 1.1, 6]} />
</Part>
<Part at={[0, 2.2 + body, 0]} bob look={{ colour: team, glow: true }} spin={1.2}>
	<T.OctahedronGeometry args={[0.32]} />
</Part>
