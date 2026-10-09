<!--
	Renders a `HitSuccessIndicator`: `Hit Success Indicator.prefab`, 192 × 107, centred 130 pixels
	up from the bottom. Hidden, it sits just below the screen.
-->
<script lang="ts">
	import { fly } from "svelte/transition"
	import { sprites } from "#lib/assets/textures/ui/sprites.ts"
	import { HitSuccessIndicator } from "#lib/view-model-component/HitSuccessIndicator.svelte.ts"
	import UICanvas from "./ui/UICanvas.svelte"

	let { indicator }: { indicator: HitSuccessIndicator } = $props()

	const { duration, easing } = HitSuccessIndicator.transition
	/** From shown to just below the screen: its height plus the 130 pixels it's up. */
	const hiddenOffset = 107 + 130
</script>

<UICanvas name="Hit Success Indicator">
	{#if indicator.shown}
		<div transition:fly={{ y: hiddenOffset, opacity: 1, duration: duration * 1000, easing }}>
			<img class="backer" alt="" src={sprites.AttackArrowBacker.src} />
			<img
				style:clip-path="inset(0 {(1 - indicator.fillAmount) * 100}% 0 0)"
				class="fill"
				alt=""
				src={sprites.AttackArrowFill.src}
			/>
			<p style:color={indicator.labelColor}>{indicator.label}</p>
		</div>
	{/if}
</UICanvas>

<style>
	div {
		position: absolute;
		bottom: 130px;
		left: 50%;
		width: 192px;
		height: 107px;
		translate: -50% 0;
	}

	img,
	p {
		position: absolute;
		left: 0;
	}

	.backer {
		bottom: 26px;
		width: 192px;
		height: 81px;
	}

	/* Filled from the left, as far as the chance to hit. */
	.fill {
		bottom: 55px;
		left: 14px;
		width: 160px;
		height: 49px;
	}

	p {
		right: 0;
		bottom: 0;
		height: 36px;
		margin: 0;
		overflow: hidden;
		font-size: 30px;
		font-style: italic;
		font-weight: bold;
		line-height: 36px;
		text-align: center;
		text-shadow: 1px 1px rgb(0 0 0 / 0.5);
		white-space: pre-wrap;
	}
</style>
