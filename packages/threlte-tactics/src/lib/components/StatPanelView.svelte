<!--
	Renders a `StatPanel`: the "Primary/Secondary Stat Panel" objects of
	`Stat Panel Controller.prefab`, 320 × 227, 20 pixels up from the bottom corner on their side.
	The secondary one is the primary one mirrored, give or take a few pixels.
-->
<script lang="ts">
	import { fly } from "svelte/transition"
	import { sprites } from "#lib/assets/textures/ui/sprites.ts"
	import { StatPanel } from "#lib/view-model-component/StatPanel.svelte.ts"
	import SlicedImage from "./ui/SlicedImage.svelte"

	let { statPanel, side }: { statPanel: StatPanel; side: "primary" | "secondary" } = $props()

	const { duration, easing } = StatPanel.transition
</script>

{#if statPanel.shown}
	<div
		class="panel {side}"
		transition:fly={{
			x: side === "primary" ? "-100%" : "100%",
			opacity: 1,
			duration: duration * 1000,
			easing
		}}
	>
		<div class="background"><SlicedImage sprite={statPanel.background} /></div>
		<img class="avatar" alt="" src={sprites[statPanel.avatar].src} />
		<p class="name">{statPanel.nameLabel}</p>
		<p class="hp">{statPanel.hpLabel}</p>
		<p class="mp">{statPanel.mpLabel}</p>
		<p class="lv">{statPanel.lvLabel}</p>
	</div>
{/if}

<style>
	.panel {
		position: absolute;
		bottom: 20px;
		width: 320px;
		height: 227px;
		color: #fff;
		font-size: 20px;
		text-shadow: 1px 1px rgb(0 0 0 / 0.5);
	}

	.primary {
		left: 0;
	}

	.secondary {
		right: 0;
	}

	.background {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 319px;
		height: 100px;
	}

	.secondary .background {
		width: 320px;
		scale: -1 -1;
	}

	.avatar {
		position: absolute;
		bottom: 0;
		width: 154px;
		height: 227px;
	}

	.primary .avatar {
		left: 0;
		scale: -1 1;
	}

	.secondary .avatar {
		right: 0;
	}

	p {
		position: absolute;
		height: 30px;
		margin: 0;
		line-height: 30px;
		white-space: pre;
	}

	.name {
		bottom: 62px;
	}

	.hp {
		bottom: 32px;
	}

	.mp,
	.lv {
		bottom: 2px;
	}

	/* Primary: name, HP and MP right-aligned from the left edge; the level near the left. */
	.primary p {
		left: 0;
		text-align: right;
	}

	.primary .name {
		width: 300px;
	}

	.primary .hp {
		width: 290px;
	}

	.primary .mp {
		width: 280px;
	}

	.primary .lv {
		left: 20px;
		width: 112px;
		text-align: left;
	}

	/* Secondary: the same, mirrored. */
	.secondary p {
		right: 0;
		text-align: left;
	}

	.secondary .name {
		width: 280px;
	}

	.secondary .hp {
		width: 290px;
	}

	.secondary .mp {
		width: 300px;
	}

	.secondary .lv {
		right: 20px;
		width: 112px;
		text-align: right;
	}
</style>
