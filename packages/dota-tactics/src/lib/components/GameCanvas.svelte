<!--
	Threlte's Canvas, but with the scene's components mounted beside the <canvas> element instead of
	inside it. Svelte keeps comment nodes as anchors for every component and block: over 15,000 for
	the board and the units. Inside a <canvas> Chrome treats them as fallback content, and removing
	one costs time in proportion to how many there are, so a creep's view unmounting took ~25 ms of
	DOM work (a dropped frame for every Fira that kills a few). In a hidden <div> it's free.
-->
<script lang="ts">
	import type { Canvas } from "@threlte/core"
	import type { ComponentProps } from "svelte"
	import SceneContext from "./SceneContext.svelte"

	let { children, ...rest }: ComponentProps<typeof Canvas> = $props()

	let canvas = $state.raw<HTMLCanvasElement>()
	let dom = $state.raw<HTMLDivElement>()
</script>

<div bind:this={dom}>
	<canvas bind:this={canvas}></canvas>
	<div hidden>
		{#if canvas && dom}
			<SceneContext {canvas} {dom} {...rest}>
				{@render children?.()}
			</SceneContext>
		{/if}
	</div>
</div>

<style>
	div {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	canvas {
		display: block;
		position: relative;
		width: 100%;
		height: 100%;
	}
</style>
