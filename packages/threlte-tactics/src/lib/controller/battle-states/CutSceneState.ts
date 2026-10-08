import { Resources } from "#lib/common/unity/Resources.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { ConversationData } from "#lib/model/ConversationData.ts"
import { didPlayerWin, isBattleOver, type BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/CutSceneState.cs`: plays the intro conversation, or once the
 * battle is over the outro for whoever won, then carries on.
 */
export function cutSceneState(owner: BattleController) {
	let data: ConversationData | null = null

	return {
		_enter() {
			const name =
				isBattleOver(owner) ?
					didPlayerWin(owner) ? "OutroSceneWin"
					:	"OutroSceneLose"
				:	"IntroScene"
			data = Resources.load<ConversationData>(`Conversations/${name}`)
			if (!data) throw new Error(`Missing Resources/Conversations/${name}`)
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
		done: () => (isBattleOver(owner) ? "EndBattleState" : "SelectUnitState")
	} satisfies BattleStateHandlers
}
