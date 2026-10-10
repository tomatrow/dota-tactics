<!-- A twin gate: a stone slab under a glowing half-ring arch filled with a translucent portal. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import { STONE } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"
</script>

<Part at={[0, 0.15, 0]} look={STONE.neutral}><T.BoxGeometry args={[1.4, 0.3, 4.2]} /></Part>
<Part at={[0, 0.3, 0]} look={{ colour: 0x9b5cff, glow: true }} rotate={[0, Math.PI / 2, 0]}>
	<T.TorusGeometry args={[1.75, 0.28, 8, 24, Math.PI]} />
</Part>
<Part
	at={[0, 0.3, 0]}
	look={{ colour: 0x9b5cff, glow: true, opacity: 0.45 }}
	rotate={[0, Math.PI / 2, 0]}
	shadow={false}
>
	<T.CircleGeometry args={[1.45, 24, 0, Math.PI]} />
</Part>
