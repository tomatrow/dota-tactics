<!-- Renders a `HitSuccessIndicator`: `Hit Success Indicator.prefab`'s canvas. -->
<script lang="ts">
	import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
	import type { HitSuccessIndicator } from "#lib/view-model-component/HitSuccessIndicator.svelte.ts"
	import PanelView from "./ui/PanelView.svelte"
	import RectTransform from "./ui/RectTransform.svelte"
	import UICanvas from "./ui/UICanvas.svelte"
	import UIImage from "./ui/UIImage.svelte"
	import UIText from "./ui/UIText.svelte"

	let { indicator }: { indicator: HitSuccessIndicator } = $props()
</script>

{#if indicator.canvasActive}
	<UICanvas>
		<PanelView height={107} panel={indicator.panel} width={192}>
			<RectTransform
				anchorMax={[0, 0]}
				anchorMin={[0, 0]}
				anchoredPosition={[0, 26]}
				pivot={[0, 0]}
				sizeDelta={[192, 81]}
			>
				<UIImage sprite="AttackArrowBacker" />
			</RectTransform>
			<RectTransform
				anchorMax={[0, 0]}
				anchorMin={[0, 0]}
				anchoredPosition={[14, 55]}
				pivot={[0, 0]}
				sizeDelta={[160, 49]}
			>
				<UIImage fillAmount={indicator.fillAmount} sprite="AttackArrowFill" type="Filled" />
			</RectTransform>
			<RectTransform
				anchorMax={[1, 0]}
				anchorMin={[0, 0]}
				anchoredPosition={[0, 0]}
				pivot={[0.5, 0]}
				sizeDelta={[0, 36]}
			>
				<UIText
					alignment={TextAnchor.MiddleCenter}
					color={indicator.labelColor}
					fontSize={30}
					fontStyle="BoldAndItalic"
					shadow={["rgb(0 0 0 / 0.5)", [1, -1]]}
					text={indicator.label}
				/>
			</RectTransform>
		</PanelView>
	</UICanvas>
{/if}
