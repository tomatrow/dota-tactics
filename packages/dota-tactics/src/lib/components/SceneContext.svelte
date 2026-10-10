<!--
	Threlte's context for a canvas, for the components below: what Threlte's own Canvas makes once
	its <canvas> is bound (`GameCanvas` mounts the components elsewhere).
-->
<script lang="ts">
	import { createThrelteContext, type Canvas } from "@threlte/core"
	import type { ComponentProps } from "svelte"

	let {
		children,
		...rest
	}: ComponentProps<typeof Canvas> & { canvas: HTMLCanvasElement; dom: HTMLDivElement } = $props()

	createThrelteContext(() => rest)
</script>

{@render children?.()}
