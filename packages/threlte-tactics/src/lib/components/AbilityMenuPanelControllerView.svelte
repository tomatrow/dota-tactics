<!--
	Renders an `AbilityMenuPanelController`: `Ability Menu Controller.prefab`, 20 pixels up from the
	bottom right corner. The panel is 180 wide and as tall as its content: the header, then the
	entries (spacing 6, bottom padding 16).
-->
<script lang="ts">
	import { fly } from "svelte/transition"
	import { AbilityMenuPanelController } from "#lib/controller/AbilityMenuPanelController.svelte.ts"
	import AbilityMenuEntryView from "./AbilityMenuEntryView.svelte"
	import SlicedImage from "./ui/SlicedImage.svelte"
	import UICanvas from "./ui/UICanvas.svelte"

	let { controller }: { controller: AbilityMenuPanelController } = $props()

	const { duration, easing } = AbilityMenuPanelController.transition
</script>

<UICanvas name="Ability Menu Controller">
	{#if controller.shown}
		<div
			class="panel"
			transition:fly={{ x: "100%", opacity: 1, duration: duration * 1000, easing }}
		>
			<SlicedImage sprite="AbilityMenu" />
			<div class="layout">
				<div class="header">{controller.title}</div>
				{#each controller.menuEntries as entry (entry)}
					<AbilityMenuEntryView {entry} />
				{/each}
			</div>
		</div>
	{/if}
</UICanvas>

<style>
	.panel {
		position: absolute;
		right: 0;
		bottom: 20px;
		width: 180px;
	}

	.layout {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-bottom: 16px;
	}

	.header {
		padding: 10px 0 4px 40px;
		color: rgb(38 164 177);
		font-size: 24px;
		line-height: normal;
		white-space: pre;
	}
</style>
