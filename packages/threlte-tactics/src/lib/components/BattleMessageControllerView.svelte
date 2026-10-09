<!--
	Renders a `BattleMessageController`: `Battle Message Controller.prefab`, a bar 60 pixels tall
	across the screen, 20 pixels down from the top.
-->
<script lang="ts">
	import { fade } from "svelte/transition"
	import { BattleMessageController } from "#lib/controller/BattleMessageController.svelte.ts"
	import SlicedImage from "./ui/SlicedImage.svelte"
	import UICanvas from "./ui/UICanvas.svelte"

	let { controller }: { controller: BattleMessageController } = $props()

	const { duration, easing } = BattleMessageController.transition
</script>

<UICanvas name="Battle Message Controller">
	{#if controller.shown}
		<div class="bar" transition:fade={{ duration: duration * 1000, easing }}>
			<div class="backer"><SlicedImage sprite="ActionNameBacker" /></div>
			<p>{controller.label}</p>
		</div>
	{/if}
</UICanvas>

<style>
	.bar {
		position: absolute;
		top: 20px;
		right: 0;
		left: 0;
		height: 60px;
	}

	.backer {
		position: absolute;
		inset: 0;
		/* The image's color: white at 180/255 alpha. */
		opacity: 0.70588;
	}

	p {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		color: #fff;
		font-size: 20px;
		white-space: pre-wrap;
	}
</style>
