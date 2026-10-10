<!-- A lane creep spawner: a flag in the team's colour. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { DARK, TEAM_COLOURS } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const team = $derived(TEAM_COLOURS[entity.team])
</script>

<Part at={[0, 1.1, 0]} look={DARK}><T.CylinderGeometry args={[0.07, 0.07, 2.2, 4]} /></Part>
<Part at={[0.48, 1.85, 0]} look={team}><T.BoxGeometry args={[0.9, 0.6, 0.05]} /></Part>
