<!--
	A UI layer laid out in reference pixels on a stage 480 pixels tall and as wide as the screen's
	aspect ratio allows, then zoomed to fill the screen's height (the project's 640×480
	`CanvasScaler`, matching height). Positions inside are CSS ones (top left origin, y down). Fills
	the nearest positioned ancestor.
-->
<script lang="ts">
	import type { Snippet } from "svelte"

	const referenceHeight = 480

	let {
		name,
		children
	}: {
		/** The region's accessible name (the prefab's). */
		name: string
		children: Snippet
	} = $props()

	let screenWidth = $state(0)
	let screenHeight = $state(0)
	const scale = $derived(screenHeight / referenceHeight)
</script>

<div
	class="screen"
	aria-label={name}
	role="region"
	bind:clientWidth={screenWidth}
	bind:clientHeight={screenHeight}
>
	{#if scale > 0}
		<div style:width="{screenWidth / scale}px" style:zoom={scale} class="stage">
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

	.stage {
		top: 0;
		left: 0;
		height: 480px;
		font-family: Arial, Helvetica, sans-serif;
	}
</style>
