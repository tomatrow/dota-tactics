<!-- A watcher: a thin dark post with a glowing spinning eye. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import { DARK } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"
</script>

<Part at={[0, 0.9, 0]} look={DARK}><T.CylinderGeometry args={[0.12, 0.16, 1.8, 5]} /></Part>
<Part at={[0, 2.05, 0]} look={{ colour: 0xffd27a, glow: true }} spin={1.5}>
	<T.OctahedronGeometry args={[0.32]} />
</Part>
