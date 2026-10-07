import { fsm } from "runic-svelte-fsm"
import { createContext } from "svelte"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/unity/Random.ts"
import { Transform } from "#lib/common/unity/Transform.svelte.ts"
import type { LevelData } from "#lib/model/LevelData.ts"
import { Point } from "#lib/model/Point.ts"
import { Turn } from "#lib/model/Turn.ts"
import { Board } from "#lib/view-model-component/Board.svelte.ts"
import { ConversationController } from "./ConversationController.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { AbilityMenuPanelController } from "./AbilityMenuPanelController.svelte.ts"
import { StatPanelController } from "./StatPanelController.svelte.ts"
import { abilityTargetState } from "./battle-states/AbilityTargetState.ts"
import { actionSelectionState } from "./battle-states/ActionSelectionState.ts"
import { defaultBattleActions } from "./battle-states/BattleState.ts"
import { categorySelectionState } from "./battle-states/CategorySelectionState.ts"
import { commandSelectionState } from "./battle-states/CommandSelectionState.ts"
import { cutSceneState } from "./battle-states/CutSceneState.ts"
import { exploreState } from "./battle-states/ExploreState.ts"
import { initBattleState } from "./battle-states/InitBattleState.ts"
import { moveSequenceState } from "./battle-states/MoveSequenceState.ts"
import { moveTargetState } from "./battle-states/MoveTargetState.ts"
import { selectUnitState } from "./battle-states/SelectUnitState.ts"

function createStateMachine(owner: BattleController) {
	return fsm("None", {
		"*": defaultBattleActions,
		// Unity's state machine starts with no current state.
		None: { start: () => "InitBattleState" },
		AbilityTargetState: abilityTargetState(owner),
		ActionSelectionState: actionSelectionState(owner),
		CategorySelectionState: categorySelectionState(owner),
		CommandSelectionState: commandSelectionState(owner),
		CutSceneState: cutSceneState(owner),
		ExploreState: exploreState(owner),
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
	/** Unity's `NotificationCenter.instance`, one per battle. */
	readonly notifications = new NotificationCenter()
	/** Unity's `UnityEngine.Random`, one per battle. */
	readonly random: Random
	readonly board = new Board()
	readonly levelData: LevelData
	readonly tileSelectionIndicator = new Transform()
	readonly conversationController = new ConversationController()
	/** The selected board position. */
	pos = Point.zero
	readonly abilityMenuPanelController = new AbilityMenuPanelController()
	readonly statPanelController: StatPanelController
	readonly turn = new Turn()
	units: Unit[] = $state([])
	/** Unity's static `ActionSelectionState.category`, which `CategorySelectionState` sets. */
	actionSelectionCategory = 0
	readonly machine: ReturnType<typeof createStateMachine>

	/** `seed`: for the battle's `random` (default: a random one). */
	constructor(levelData: LevelData, { seed = Random.randomSeed() }: { seed?: number } = {}) {
		this.levelData = levelData
		this.random = new Random(seed)
		this.statPanelController = new StatPanelController(this.random)
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
