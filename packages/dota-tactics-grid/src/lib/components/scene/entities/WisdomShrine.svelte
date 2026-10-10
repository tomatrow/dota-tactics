<!-- A wisdom shrine: four stone posts on a round base around a floating blue crystal. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import { STONE } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	const posts = [0, 1, 2, 3].map((k) => (k / 4) * Math.PI * 2 + Math.PI / 4)
</script>

<Part at={[0, 0.15, 0]} look={STONE.neutral}><T.CylinderGeometry args={[1.5, 1.7, 0.3, 10]} /></Part
>
{#each posts as a (a)}
	<Part at={[Math.cos(a) * 1.15, 1, Math.sin(a) * 1.15]} look={STONE.neutral}>
		<T.BoxGeometry args={[0.35, 1.4, 0.35]} />
	</Part>
{/each}
<Part at={[0, 2.1, 0]} bob look={{ colour: 0x7ad7ff, glow: true }} spin={1}>
	<T.OctahedronGeometry args={[0.5]} />
</Part>
