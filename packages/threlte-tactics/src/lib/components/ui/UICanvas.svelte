<!--
	A Unity screen-space overlay `Canvas` with the project's `CanvasScaler` (scale with screen size,
	reference resolution 640×480, match height): content is laid out in reference pixels on a
	480-pixel-tall canvas as wide as the screen's aspect ratio allows, then zoomed to the screen.
	Fills the nearest positioned ancestor.
-->
<script lang="ts">
	import type { Snippet } from "svelte"

	const referenceHeight = 480

	let { children }: { children: Snippet } = $props()

	let screenWidth = $state(0)
	let screenHeight = $state(0)
	const scale = $derived(screenHeight / referenceHeight)
</script>

<div class="screen" bind:clientWidth={screenWidth} bind:clientHeight={screenHeight}>
	{#if scale > 0}
		<div style:width="{screenWidth / scale}px" style:zoom={scale} class="canvas">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	div {
		position: absolute;
	}

	.screen {
		inset: 0;
		overflow: hidden;
		/* Keyboard only: the UI never takes the mouse. */
		pointer-events: none;
	}

	.canvas {
		bottom: 0;
		left: 0;
		height: 480px;
	}
</style>
