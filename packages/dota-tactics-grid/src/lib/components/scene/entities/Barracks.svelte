<!-- Barracks: a stone block under a pyramid roof; ranged barracks are taller, with a crystal. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { STONE, TEAM_COLOURS } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const team = $derived(TEAM_COLOURS[entity.team])
	const stone = $derived(STONE[entity.team])
</script>

{#if entity.type === "range"}
	<Part at={[0, 0.6, 0]} look={stone}><T.BoxGeometry args={[2.6, 1.2, 2.6]} /></Part>
	<Part at={[0, 2.3, 0]} look={team} rotate={[0, Math.PI / 4, 0]}>
		<T.ConeGeometry args={[1.9, 2.2, 4]} />
	</Part>
	<Part at={[0, 3.7, 0]} look={{ colour: team, glow: true }} spin={1}>
		<T.OctahedronGeometry args={[0.3]} />
	</Part>
{:else}
	<Part at={[0, 0.7, 0]} look={stone}><T.BoxGeometry args={[3.2, 1.4, 3.2]} /></Part>
	<Part at={[0, 2.15, 0]} look={team} rotate={[0, Math.PI / 4, 0]}>
		<T.ConeGeometry args={[2.5, 1.5, 4]} />
	</Part>
{/if}
