<!--
	Renders a `ConversationPanel`: the "Left/Right Edge Conversation Panel" objects of
	`Conversation Controller.prefab`, 465 × 227, in a corner on their side, 20 pixels in from the top
	or bottom edge. The left one is the right one mirrored.
-->
<script lang="ts">
	import { quadIn } from "svelte/easing"
	import { fly } from "svelte/transition"
	import { sprites } from "#lib/assets/textures/ui/sprites.ts"
	import { cssEasing } from "#lib/common/animation/cssEasing.ts"
	import { ConversationPanel } from "#lib/view-model-component/ConversationPanel.svelte.ts"
	import { fitText } from "./ui/fitText.ts"
	import SlicedImage from "./ui/SlicedImage.svelte"

	let {
		conversationPanel,
		side
	}: { conversationPanel: ConversationPanel; side: "left" | "right" } = $props()

	const { duration, easing } = ConversationPanel.transition
	const speaker = $derived(sprites[conversationPanel.speaker])
	// The "more" arrow bobs 5 pixels either side of its place, forever.
	const bounce = cssEasing(quadIn)
</script>

{#if conversationPanel.shown}
	<div
		class="panel {side}"
		class:bottom={conversationPanel.edge === "bottom"}
		class:top={conversationPanel.edge === "top"}
		transition:fly={{
			x: side === "left" ? "-100%" : "100%",
			opacity: 1,
			duration: duration * 1000,
			easing
		}}
	>
		<div class="background"><SlicedImage sprite="ConversationPanel" /></div>
		<img class="speaker" alt="" height={speaker.height} src={speaker.src} width={speaker.width} />
		{#if conversationPanel.arrow}
			<img
				style:animation-timing-function={bounce}
				class="arrow"
				alt=""
				src={sprites.MoreConversationArrow.src}
			/>
		{/if}
		<p {@attach fitText(conversationPanel.message, [20, 30])}>
			<span>{conversationPanel.message}</span>
		</p>
	</div>
{/if}

<style>
	.panel {
		position: absolute;
		width: 465px;
		height: 227px;
	}

	.left {
		left: 0;
	}

	.right {
		right: 0;
	}

	.top {
		top: 20px;
	}

	.bottom {
		bottom: 20px;
	}

	.background {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 465px;
		height: 140px;
	}

	.left .background {
		scale: -1 1;
	}

	.speaker {
		position: absolute;
		bottom: 0;
	}

	.right .speaker {
		right: 0;
	}

	/* Mirrored about x = 154. */
	.left .speaker {
		left: 154px;
		transform-origin: left;
		scale: -1 1;
	}

	.arrow {
		position: absolute;
		bottom: -12px;
		width: 33px;
		height: 24px;
		animation: bounce 0.5s infinite alternate;
	}

	.right .arrow {
		right: 262px;
	}

	.left .arrow {
		left: 262px;
	}

	p {
		position: absolute;
		bottom: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 284px;
		height: 120px;
		margin: 0;
		overflow: hidden;
		color: #682c15;
		line-height: normal;
		text-align: center;
		white-space: pre-wrap;
	}

	.right p {
		right: 136px;
	}

	.left p {
		left: 136px;
	}

	@keyframes bounce {
		from {
			translate: 0 -5px;
		}

		to {
			translate: 0 5px;
		}
	}
</style>
