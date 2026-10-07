import { fsm } from "runic-svelte-fsm"
import { createContext } from "svelte"
import { Transform } from "#lib/common/unity/Transform.svelte.ts"
import type { LevelData } from "#lib/model/LevelData.ts"
import { Point } from "#lib/model/Point.ts"
import { Board } from "#lib/view-model-component/Board.svelte.ts"
import { defaultBattleActions } from "./battle-states/BattleState.ts"
import { initBattleState } from "./battle-states/InitBattleState.ts"
import { moveTargetState } from "./battle-states/MoveTargetState.ts"

function createStateMachine(owner: BattleController) {
	return fsm("None", {
		"*": defaultBattleActions,
		// Unity's state machine starts with no current state.
		None: { start: () => "InitBattleState" },
		InitBattleState: initBattleState(owner),
		MoveTargetState: moveTargetState(owner)
	})
}

/**
 * Port of `Controller/BattleController.cs`: the battle's state machine (Unity's `StateMachine`
 * base class is `runic-svelte-fsm`) and everything its states share.
 */
export class BattleController {
	readonly board = new Board()
	readonly levelData: LevelData
	readonly tileSelectionIndicator = new Transform()
	/** The selected board position. */
	pos = Point.zero
	readonly machine: ReturnType<typeof createStateMachine>

	constructor(levelData: LevelData) {
		this.levelData = levelData
		this.machine = createStateMachine(this)
	}

	/** Unity's `Start`. */
	start(): void {
		this.machine.start()
	}

	/** Unity's `InputController.moveEvent`, which the current state listens to. */
	move(direction: Point): void {
		this.machine.move(direction)
	}

	/** Unity's `InputController.fireEvent`, which the current state listens to. */
	fire(button: number): void {
		this.machine.fire(button)
	}
}

export const [getBattleController, setBattleController] = createContext<BattleController>()
