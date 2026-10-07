import { nextFrame } from "#lib/common/unity/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { Point } from "#lib/model/Point.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"

/** Port of `Controller/Battle States/InitBattleState.cs`: builds the battle, then hands over. */
export function initBattleState(owner: BattleController) {
	async function init(): Promise<void> {
		owner.board.load(owner.levelData)
		const [x, , z] = owner.levelData.tiles[0]!
		selectTile(owner, Point.of(Math.trunc(x), Math.trunc(z)))
		// Unity can't change state during a transition (`Enter`), so it waits a frame.
		await nextFrame()
		owner.machine.done()
	}

	return {
		_enter() {
			void init()
		},
		done: () => "MoveTargetState"
	} satisfies BattleStateHandlers
}
