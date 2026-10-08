<!-- Renders a `BattleMessageController`: `Battle Message Controller.prefab`'s canvas. -->
<script lang="ts">
	import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
	import type { BattleMessageController } from "#lib/controller/BattleMessageController.svelte.ts"
	import RectTransform from "./ui/RectTransform.svelte"
	import UICanvas from "./ui/UICanvas.svelte"
	import UIImage from "./ui/UIImage.svelte"
	import UIText from "./ui/UIText.svelte"

	let { controller }: { controller: BattleMessageController } = $props()
</script>

{#if controller.canvasActive}
	<UICanvas name="Battle Message Controller" alpha={controller.alpha}>
		<RectTransform
			anchorMax={[1, 1]}
			anchorMin={[0, 1]}
			anchoredPosition={[0, -20]}
			pivot={[0.5, 1]}
			sizeDelta={[0, 60]}
		>
			<UIImage alpha={0.70588237} sprite="ActionNameBacker" type="Sliced" />
			<RectTransform anchorMax={[1, 1]} anchorMin={[0, 0]} sizeDelta={[0, 0]}>
				<UIText
					alignment={TextAnchor.MiddleCenter}
					color="#ffffff"
					fontSize={20}
					text={controller.label}
				/>
			</RectTransform>
		</RectTransform>
	</UICanvas>
{/if}
