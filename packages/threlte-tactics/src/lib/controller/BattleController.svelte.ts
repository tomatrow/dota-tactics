import { fsm } from "runic-svelte-fsm"
import { createContext } from "svelte"
import { Transform } from "#lib/common/unity/Transform.svelte.ts"
import type { LevelData } from "#lib/model/LevelData.ts"
import { Point } from "#lib/model/Point.ts"
import { Board } from "#lib/view-model-component/Board.svelte.ts"
import { ConversationController } from "./ConversationController.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { defaultBattleActions } from "./battle-states/BattleState.ts"
import { cutSceneState } from "./battle-states/CutSceneState.ts"
import { initBattleState } from "./battle-states/InitBattleState.ts"
import { moveSequenceState } from "./battle-states/MoveSequenceState.ts"
import { moveTargetState } from "./battle-states/MoveTargetState.ts"
import { selectUnitState } from "./battle-states/SelectUnitState.ts"

function createStateMachine(owner: BattleController) {
	return fsm("None", {
		"*": defaultBattleActions,
		// Unity's state machine starts with no current state.
		None: { start: () => "InitBattleState" },
		CutSceneState: cutSceneState(owner),
		InitBattleState: initBattleState(owner),
		MoveSequenceState: moveSequenceState(owner),
		MoveTargetState: moveTargetState(owner),
		SelectUnitState: selectUnitState(owner)
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
	readonly conversationController = new ConversationController()
	/** The selected board position. */
	pos = Point.zero
	units: Unit[] = $state([])
	// TODO(part 16): replaced by the turn's actor.
	currentUnit: Unit | null = null
	readonly machine: ReturnType<typeof createStateMachine>

	constructor(levelData: LevelData) {
		this.levelData = levelData
		this.machine = createStateMachine(this)
	}

	get currentTile(): Tile | null {
		return this.board.getTile(this.pos)
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
