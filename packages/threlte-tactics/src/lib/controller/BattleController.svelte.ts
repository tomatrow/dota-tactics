import { fsm } from "runic-svelte-fsm"
import { createContext } from "svelte"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/unity/Random.ts"
import { Transform } from "#lib/common/unity/Transform.svelte.ts"
import type { LevelData } from "#lib/model/LevelData.ts"
import { Point } from "#lib/model/Point.ts"
import { Turn } from "#lib/model/Turn.ts"
import { Drivers } from "#lib/enums/Drivers.ts"
import { ComputerPlayer } from "#lib/view-model-component/ai/ComputerPlayer.ts"
import { Board } from "#lib/view-model-component/Board.svelte.ts"
import { FacingIndicator } from "#lib/view-model-component/FacingIndicator.svelte.ts"
import { HitSuccessIndicator } from "#lib/view-model-component/HitSuccessIndicator.svelte.ts"
import { ConversationController } from "./ConversationController.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { AbilityMenuPanelController } from "./AbilityMenuPanelController.svelte.ts"
import { AutoStatusController } from "./AutoStatusController.ts"
import { BattleMessageController } from "./BattleMessageController.svelte.ts"
import { StatPanelController } from "./StatPanelController.svelte.ts"
import { abilityTargetState } from "./battle-states/AbilityTargetState.ts"
import { actionSelectionState } from "./battle-states/ActionSelectionState.ts"
import { categorySelectionState } from "./battle-states/CategorySelectionState.ts"
import { commandSelectionState } from "./battle-states/CommandSelectionState.ts"
import { confirmAbilityTargetState } from "./battle-states/ConfirmAbilityTargetState.ts"
import { cutSceneState } from "./battle-states/CutSceneState.ts"
import { endBattleState } from "./battle-states/EndBattleState.ts"
import { endFacingState } from "./battle-states/EndFacingState.ts"
import { exploreState } from "./battle-states/ExploreState.ts"
import { initBattleState } from "./battle-states/InitBattleState.ts"
import { moveSequenceState } from "./battle-states/MoveSequenceState.ts"
import { moveTargetState } from "./battle-states/MoveTargetState.ts"
import { performAbilityState } from "./battle-states/PerformAbilityState.ts"
import { selectUnitState } from "./battle-states/SelectUnitState.ts"
import type { BaseVictoryCondition } from "./victory-conditions/BaseVictoryCondition.ts"

function createStateMachine(owner: BattleController) {
	return fsm("None", {
		// Unity's state machine starts with no current state.
		None: { start: () => "InitBattleState" },
		AbilityTargetState: abilityTargetState(owner),
		ActionSelectionState: actionSelectionState(owner),
		CategorySelectionState: categorySelectionState(owner),
		CommandSelectionState: commandSelectionState(owner),
		ConfirmAbilityTargetState: confirmAbilityTargetState(owner),
		CutSceneState: cutSceneState(owner),
		EndBattleState: endBattleState(owner),
		EndFacingState: endFacingState(owner),
		ExploreState: exploreState(owner),
		InitBattleState: initBattleState(owner),
		MoveSequenceState: moveSequenceState(owner),
		MoveTargetState: moveTargetState(owner),
		PerformAbilityState: performAbilityState(owner),
		SelectUnitState: selectUnitState(owner)
	})
}

export interface BattleOptions {
	/** For a new `random` (default: a random one). */
	seed?: number
	/** Unity's `UnityEngine.Random`, which lasts from one battle to the next (default: a new one). */
	random?: Random
	/**
	 * Spawns the battle's units instead of `InitBattleState` (whose `SpawnTestUnits`, three heroes
	 * and three enemies on random tiles, is temporary code in Unity too). For tests that need
	 * particular units in particular places.
	 */
	spawnTestUnits?: ((battle: BattleController) => void) | null
	/** Unity's `Application.LoadLevel(0)`: starts the battle over, which `EndBattleState` does. */
	loadLevel?: (() => void) | null
}

/**
 * Port of `Controller/BattleController.cs`: the battle's state machine (Unity's `StateMachine`
 * base class is `runic-svelte-fsm`) and everything its states share, including the other
 * components on its GameObject.
 */
export class BattleController {
	/** Unity's `NotificationCenter.instance`, one per battle. */
	readonly notifications = new NotificationCenter()
	/** Unity's `UnityEngine.Random`. */
	readonly random: Random
	readonly board = new Board()
	readonly levelData: LevelData
	readonly tileSelectionIndicator = new Transform()
	readonly conversationController = new ConversationController()
	/** The selected board position. */
	pos = Point.zero
	readonly abilityMenuPanelController = new AbilityMenuPanelController()
	readonly statPanelController = new StatPanelController()
	readonly hitSuccessIndicator = new HitSuccessIndicator()
	readonly battleMessageController = new BattleMessageController()
	/** The tile selection indicator's child, which `EndFacingState` shows. */
	readonly facingIndicator = new FacingIndicator()
	readonly turn = new Turn()
	units: Unit[] = $state([])
	/** `TurnOrderController.round()`, which `SelectUnitState` steps through. */
	round: Iterator<Unit> | null = null
	/** Plans the turns of computer-driven units (a component of Unity's Battle Controller). */
	readonly cpu: ComputerPlayer
	/** Unity's static `ActionSelectionState.category`, which `CategorySelectionState` sets. */
	actionSelectionCategory = 0
	/** Knocks out units with no HP left (a component of Unity's Battle Controller). */
	readonly autoStatusController: AutoStatusController
	/** Unity's `GetComponent<BaseVictoryCondition>()`, which `InitBattleState` adds. */
	victoryCondition: BaseVictoryCondition | null = null

	/** Replaces `InitBattleState`'s own (`BattleOptions.spawnTestUnits`). */
	readonly spawnTestUnits: ((battle: BattleController) => void) | null
	readonly loadLevel: (() => void) | null
	readonly machine: ReturnType<typeof createStateMachine>

	constructor(
		levelData: LevelData,
		{
			seed = Random.randomSeed(),
			random = new Random(seed),
			spawnTestUnits = null,
			loadLevel = null
		}: BattleOptions = {}
	) {
		this.levelData = levelData
		this.random = random
		this.spawnTestUnits = spawnTestUnits
		this.loadLevel = loadLevel
		this.autoStatusController = new AutoStatusController(this.notifications)
		this.cpu = new ComputerPlayer(this)
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
		if (this.#listening()) this.machine.move(direction)
	}

	/** Unity's `InputController.fireEvent`, which the current state listens to. */
	fire(button: number): void {
		if (this.#listening()) this.machine.fire(button)
	}

	/**
	 * Unity's `BattleState.AddListeners`: a state listens to the input unless the computer drives
	 * the turn's actor. (Unity decides when the state is entered; no driver changes mid-state.)
	 */
	#listening(): boolean {
		// PORT-FIX: Unity's cut scene doesn't listen either when a computer-driven unit's action
		// ended the battle, so its outro could never be read past.
		if (this.machine.current === "CutSceneState") return true

		const driver = this.turn.actor?.driver ?? null
		return driver === null || driver.current === Drivers.Human
	}
}

export const [getBattleController, setBattleController] = createContext<BattleController>()
