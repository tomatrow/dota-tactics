<!-- A neutral item stash: a wooden chest with a gold lid. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import { GOLD, WOOD } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"
</script>

<Part at={[0, 0.28, 0]} look={WOOD}><T.BoxGeometry args={[0.9, 0.55, 0.6]} /></Part>
<Part at={[0, 0.62, 0]} look={GOLD}><T.BoxGeometry args={[0.95, 0.15, 0.65]} /></Part>
