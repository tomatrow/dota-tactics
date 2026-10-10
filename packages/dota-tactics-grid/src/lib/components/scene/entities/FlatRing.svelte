<!--
	A thin ring lying on the ground around a model.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { Look } from "#lib/scene/palette.ts"
	import Part from "./Part.svelte"

	let {
		radius,
		tube,
		look,
		y = 0.06
	}: { radius: number; tube: number; look: Look; y?: number } = $props()
</script>

<Part at={[0, y, 0]} {look} rotate={[Math.PI / 2, 0, 0]} shadow={false}>
	<T.TorusGeometry args={[radius, tube, 4, 48]} />
</Part>
