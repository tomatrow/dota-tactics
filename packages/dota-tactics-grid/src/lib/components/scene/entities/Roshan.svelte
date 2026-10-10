<!-- Roshan: a hulking purple body and head, with horns and glowing eyes. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import Part from "./Part.svelte"

	const BODY = 0x4a2d63
	const HORN = 0xe8dcc0
	const EYE = { colour: 0xff8a3c, glow: true }
</script>

<Part at={[0, 1.0, 0]} look={BODY} scale={[1.4, 0.9, 1.1]}>
	<T.DodecahedronGeometry args={[1.1]} />
</Part>
<Part at={[1.3, 1.35, 0]} look={BODY}><T.DodecahedronGeometry args={[0.6]} /></Part>
<Part at={[1.45, 2.0, 0.3]} look={HORN} rotate={[0.4, 0, -0.5]}>
	<T.ConeGeometry args={[0.16, 0.7, 5]} />
</Part>
<Part at={[1.45, 2.0, -0.3]} look={HORN} rotate={[-0.4, 0, -0.5]}>
	<T.ConeGeometry args={[0.16, 0.7, 5]} />
</Part>
<Part at={[1.85, 1.45, 0.2]} look={EYE}><T.SphereGeometry args={[0.08, 6, 4]} /></Part>
<Part at={[1.85, 1.45, -0.2]} look={EYE}><T.SphereGeometry args={[0.08, 6, 4]} /></Part>
