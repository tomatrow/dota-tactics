<!-- Renders a `ConversationController`: `Conversation Controller.prefab`'s canvas. -->
<script lang="ts">
	import type { ConversationController } from "#lib/controller/ConversationController.svelte.ts"
	import ConversationPanelView from "./ConversationPanelView.svelte"
	import UICanvas from "./ui/UICanvas.svelte"

	let { controller }: { controller: ConversationController } = $props()
</script>

{#if controller.canvasActive}
	<UICanvas name="Conversation Controller">
		<ConversationPanelView conversationPanel={controller.rightPanel} edge="right" />
		<ConversationPanelView conversationPanel={controller.leftPanel} edge="left" />
	</UICanvas>
{/if}
