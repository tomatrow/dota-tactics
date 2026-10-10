<!-- Roshan's pit: a glowing ring around a faint translucent floor. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import { ROSHAN } from "#lib/scene/palette.ts"
	import FlatRing from "./FlatRing.svelte"
	import Part from "./Part.svelte"
</script>

<FlatRing look={{ colour: ROSHAN, glow: true }} radius={5.5} tube={0.18} y={0.12} />
<Part
	at={[0, 0.08, 0]}
	look={{ colour: ROSHAN, opacity: 0.16 }}
	rotate={[-Math.PI / 2, 0, 0]}
	shadow={false}
>
	<T.CircleGeometry args={[5.5, 48]} />
</Part>
