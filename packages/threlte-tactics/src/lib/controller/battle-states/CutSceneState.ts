import { Resources } from "#lib/common/unity/Resources.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { ConversationData } from "#lib/model/ConversationData.ts"
import type { BattleStateHandlers } from "./BattleState.ts"

/** Port of `Controller/Battle States/CutSceneState.cs`: plays a conversation. */
export function cutSceneState(owner: BattleController) {
	let data: ConversationData | null = null

	return {
		_enter() {
			// TODO(part 22): the outro conversations once the battle can end.
			data = Resources.load<ConversationData>("Conversations/IntroScene")
			if (!data) throw new Error("Missing Resources/Conversations/IntroScene")
			// Unity's `completeEvent`, which this state listens to while it is current.
			void owner.conversationController.show(data).then(() => owner.machine.done())
		},
		_exit() {
			// (`Resources.UnloadAsset`.)
			data = null
		},
		fire() {
			owner.conversationController.next()
		},
		// TODO(part 22): `EndBattleState` once the battle is over.
		done: () => "SelectUnitState"
	} satisfies BattleStateHandlers
}
