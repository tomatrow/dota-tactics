<!-- An entity the viewer has no model for: a map pin in the team's colour. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { TEAM_COLOURS } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const team = $derived(TEAM_COLOURS[entity.team])
</script>

<Part at={[0, 0.5, 0]} look={{ colour: team }} rotate={[Math.PI, 0, 0]}>
	<T.ConeGeometry args={[0.3, 1.0, 6]} />
</Part>
<Part at={[0, 1.15, 0]} look={{ colour: team, glow: true }}>
	<T.SphereGeometry args={[0.3, 10, 8]} />
</Part>
