<!--
	Renders a `StatPanel`: the "Primary/Secondary Stat Panel" objects of
	`Stat Panel Controller.prefab`. The secondary one is the primary one mirrored, give or take a
	few pixels.
-->
<script lang="ts">
	import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
	import type { Vector2 } from "#lib/common/vector.ts"
	import type { StatPanel } from "#lib/view-model-component/StatPanel.svelte.ts"
	import PanelView from "./ui/PanelView.svelte"
	import RectTransform from "./ui/RectTransform.svelte"
	import UIImage from "./ui/UIImage.svelte"
	import UIText from "./ui/UIText.svelte"

	let { statPanel, side }: { statPanel: StatPanel; side: "primary" | "secondary" } = $props()

	interface Label {
		anchoredPosition: Vector2
		sizeDelta: Vector2
		alignment: TextAnchor
	}

	const { MiddleLeft, MiddleRight } = TextAnchor

	/** The children's RectTransforms and alignments, from the prefab. */
	const layouts = {
		primary: {
			background: {
				anchorMin: [0, 0],
				anchorMax: [1, 0],
				anchoredPosition: [0, 0],
				sizeDelta: [-1, 100],
				pivot: [0, 0],
				scale: [1, 1]
			},
			avatar: { anchoredPosition: [154, 0], scale: [-1, 1] },
			corner: [0, 0],
			name: { anchoredPosition: [0, 62], sizeDelta: [300, 30], alignment: MiddleRight },
			hp: { anchoredPosition: [0, 32], sizeDelta: [290, 30], alignment: MiddleRight },
			mp: { anchoredPosition: [0, 2], sizeDelta: [280, 30], alignment: MiddleRight },
			lv: { anchoredPosition: [20, 2], sizeDelta: [112, 30], alignment: MiddleLeft }
		},
		secondary: {
			background: {
				anchorMin: [0, 0],
				anchorMax: [1, 0],
				anchoredPosition: [0, 50],
				sizeDelta: [0, 100],
				pivot: [0.5, 0.5],
				scale: [-1, -1]
			},
			avatar: { anchoredPosition: [0, 0], scale: [1, 1] },
			corner: [1, 0],
			name: { anchoredPosition: [0, 62], sizeDelta: [280, 30], alignment: MiddleLeft },
			hp: { anchoredPosition: [0, 32], sizeDelta: [290, 30], alignment: MiddleLeft },
			mp: { anchoredPosition: [0, 2], sizeDelta: [300, 30], alignment: MiddleLeft },
			lv: { anchoredPosition: [-20, 2], sizeDelta: [112, 30], alignment: MiddleRight }
		}
	} satisfies Record<
		typeof side,
		{
			background: Record<
				"anchorMin" | "anchorMax" | "anchoredPosition" | "sizeDelta" | "pivot" | "scale",
				Vector2
			>
			avatar: { anchoredPosition: Vector2; scale: Vector2 }
			corner: Vector2
			name: Label
			hp: Label
			mp: Label
			lv: Label
		}
	>

	const layout = $derived(layouts[side])
	const labels = $derived([
		[layout.name, statPanel.nameLabel],
		[layout.hp, statPanel.hpLabel],
		[layout.mp, statPanel.mpLabel],
		[layout.lv, statPanel.lvLabel]
	] as const)
</script>

<PanelView height={227} panel={statPanel.panel} width={320}>
	<RectTransform {...layout.background}>
		<UIImage sprite={statPanel.background} type="Sliced" />
	</RectTransform>
	<RectTransform
		{...layout.avatar}
		anchorMax={layout.corner}
		anchorMin={layout.corner}
		pivot={layout.corner}
		sizeDelta={[154, 227]}
	>
		<UIImage sprite={statPanel.avatar} />
	</RectTransform>
	{#each labels as [{ alignment, ...rect }, text], i (i)}
		<RectTransform
			{...rect}
			anchorMax={layout.corner}
			anchorMin={layout.corner}
			pivot={layout.corner}
		>
			<UIText
				{alignment}
				color="#ffffff"
				fontSize={20}
				shadow={["rgb(0 0 0 / 0.5)", [1, -1]]}
				{text}
			/>
		</RectTransform>
	{/each}
</PanelView>
