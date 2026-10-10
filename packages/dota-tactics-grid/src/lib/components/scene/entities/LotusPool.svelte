<!-- A lotus pool: a shallow glowing pool with a pink flower and a gold bud. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import { GOLD, WATER } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"
</script>

<Part at={[0, 0.1, 0]} look={{ colour: WATER, glow: true, roughness: 0.2 }}>
	<T.CylinderGeometry args={[1.5, 1.6, 0.2, 12]} />
</Part>
<Part at={[0, 0.45, 0]} look={0xf2a0c8} scale={[1, 0.5, 1]}>
	<T.OctahedronGeometry args={[0.55]} />
</Part>
<Part at={[0, 0.6, 0]} look={{ colour: GOLD, glow: true }}>
	<T.SphereGeometry args={[0.18, 8, 6]} />
</Part>
