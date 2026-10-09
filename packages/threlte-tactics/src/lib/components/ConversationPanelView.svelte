<!--
	Renders a `ConversationPanel`: the "Left/Right Edge Conversation Panel" objects of
	`Conversation Controller.prefab`. The left one is the right one mirrored.
-->
<script lang="ts">
	import { quadIn } from "svelte/easing"
	import { sprites } from "#lib/assets/textures/ui/sprites.ts"
	import { cssEasing } from "#lib/common/animation/cssEasing.ts"
	import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
	import type { Vector2 } from "#lib/common/vector.ts"
	import type { ConversationPanel } from "#lib/view-model-component/ConversationPanel.svelte.ts"
	import PanelView from "./ui/PanelView.svelte"
	import RectTransform from "./ui/RectTransform.svelte"
	import UIImage from "./ui/UIImage.svelte"
	import UIText from "./ui/UIText.svelte"

	let {
		conversationPanel,
		edge
	}: { conversationPanel: ConversationPanel; edge: "left" | "right" } = $props()

	// The children's RectTransforms, from the prefab: anchored and pivoted on the panel's bottom
	// corner at its edge, `inward` pointing away from that edge. The left panel's background and
	// portrait are mirrored.
	const corner: Record<typeof edge, Vector2> = { left: [0, 0], right: [1, 0] }
	const rect = $derived({ anchorMin: corner[edge], anchorMax: corner[edge], pivot: corner[edge] })
	const inward = $derived(edge === "left" ? 1 : -1)
	const mirror: Vector2 = $derived([edge === "left" ? -1 : 1, 1])
	const speaker = $derived(sprites[conversationPanel.speaker])

	// `ConversationPanel.Start`: bob 5 pixels either side of the arrow's place, forever.
	const bounce = cssEasing(quadIn)
</script>

<PanelView height={227} panel={conversationPanel.panel} width={465}>
	<RectTransform
		{...rect}
		anchoredPosition={[edge === "left" ? 465 : 0, 0]}
		scale={mirror}
		sizeDelta={[465, 140]}
	>
		<UIImage sprite="ConversationPanel" type="Sliced" />
	</RectTransform>
	<RectTransform
		{...rect}
		anchoredPosition={[edge === "left" ? 154 : 0, 0]}
		scale={mirror}
		sizeDelta={[speaker.width, speaker.height]}
	>
		<UIImage sprite={conversationPanel.speaker} />
	</RectTransform>
	{#if conversationPanel.arrow}
		<RectTransform {...rect} anchoredPosition={[262 * inward, -12]} sizeDelta={[33, 24]}>
			<div style:animation-timing-function={bounce}>
				<UIImage sprite="MoreConversationArrow" />
			</div>
		</RectTransform>
	{/if}
	<RectTransform {...rect} anchoredPosition={[136 * inward, 10]} sizeDelta={[284, 120]}>
		<UIText
			alignment={TextAnchor.MiddleCenter}
			bestFit={[20, 30]}
			color="#682c15"
			text={conversationPanel.message}
		/>
	</RectTransform>
</PanelView>

<style>
	div {
		position: absolute;
		inset: 0;
		animation: bounce 0.5s infinite alternate;
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
