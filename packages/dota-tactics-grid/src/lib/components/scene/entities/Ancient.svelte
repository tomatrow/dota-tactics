<!-- An Ancient: a stepped stone dais under a tall spinning crystal ringed by a tilted halo. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MapEntity } from "#lib/map/schema.ts"
	import { STONE, TEAM_COLOURS } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	let { entity }: { entity: MapEntity } = $props()

	const team = $derived(TEAM_COLOURS[entity.team])
	const stone = $derived(STONE[entity.team])
</script>

<Part at={[0, 0.4, 0]} look={stone}><T.CylinderGeometry args={[4.2, 4.8, 0.8, 8]} /></Part>
<Part at={[0, 1.1, 0]} look={stone}><T.CylinderGeometry args={[3.0, 3.5, 0.6, 8]} /></Part>
<Part
	at={[0, 4.4, 0]}
	look={{ colour: team, glow: true, metalness: 0.2, roughness: 0.4 }}
	scale={[1, 1.8, 1]}
	spin={0.5}
>
	<T.OctahedronGeometry args={[1.8]} />
</Part>
<Part
	at={[0, 3.0, 0]}
	look={{ colour: team, glow: true }}
	rotate={[Math.PI / 2.4, 0, 0]}
	spin={-0.3}
>
	<T.TorusGeometry args={[2.7, 0.14, 6, 40]} />
</Part>
