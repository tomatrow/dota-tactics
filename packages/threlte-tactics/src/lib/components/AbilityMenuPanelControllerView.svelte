<!--
	Renders an `AbilityMenuPanelController`: `Ability Menu Controller.prefab`. The panel is 180 wide
	and as tall as its vertical layout group (bottom padding 16, spacing 6) needs: the header, then
	the entries.
-->
<script lang="ts">
	import type { AbilityMenuPanelController } from "#lib/controller/AbilityMenuPanelController.svelte.ts"
	import AbilityMenuEntryView from "./AbilityMenuEntryView.svelte"
	import PanelView from "./ui/PanelView.svelte"
	import UICanvas from "./ui/UICanvas.svelte"
	import UIImage from "./ui/UIImage.svelte"

	let { controller }: { controller: AbilityMenuPanelController } = $props()
</script>

{#if controller.canvasActive}
	<UICanvas name="Ability Menu Controller">
		<PanelView panel={controller.panel} width={180}>
			<UIImage sprite="AbilityMenu" type="Sliced" />
			<div class="layout">
				<div class="header">{controller.title}</div>
				{#each controller.menuEntries as entry (entry)}
					<AbilityMenuEntryView {entry} />
				{/each}
			</div>
		</PanelView>
	</UICanvas>
{/if}

<style>
	.layout {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-bottom: 16px;
	}

	/* A horizontal layout group (padding left 40, top 10, bottom 4) around the title. */
	.header {
		padding: 10px 0 4px 40px;
		color: rgb(38 164 177);
		font-size: 24px;
		line-height: normal;
		white-space: pre;
	}
</style>
