import { Resources } from "#lib/common/Resources.ts"
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
			data = Resources.load(`Conversations/${name}`)
			if (!data) throw new Error(`Missing Resources/Conversations/${name}`)
			// The cut scene ends when the conversation does.
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
