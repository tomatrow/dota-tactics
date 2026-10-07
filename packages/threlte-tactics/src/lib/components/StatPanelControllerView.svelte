<!-- Renders a `StatPanelController`: `Stat Panel Controller.prefab`'s canvas. -->
<script lang="ts">
	import type { StatPanelController } from "#lib/controller/StatPanelController.svelte.ts"
	import StatPanelView from "./StatPanelView.svelte"
	import UICanvas from "./ui/UICanvas.svelte"

	let { controller }: { controller: StatPanelController } = $props()
</script>

<UICanvas>
	<StatPanelView side="primary" statPanel={controller.primaryPanel} />
	<StatPanelView side="secondary" statPanel={controller.secondaryPanel} />
</UICanvas>
