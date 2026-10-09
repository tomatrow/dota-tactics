<!-- Renders a `ConversationController`: `Conversation Controller.prefab`'s canvas. -->
<script lang="ts">
	import type { ConversationController } from "#lib/controller/ConversationController.svelte.ts"
	import ConversationPanelView from "./ConversationPanelView.svelte"
	import UICanvas from "./ui/UICanvas.svelte"

	let { controller }: { controller: ConversationController } = $props()
</script>

<UICanvas name="Conversation Controller">
	<ConversationPanelView conversationPanel={controller.rightPanel} side="right" />
	<ConversationPanelView conversationPanel={controller.leftPanel} side="left" />
</UICanvas>
