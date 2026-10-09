import { fsm } from "runic-svelte-fsm"
import { createContext } from "svelte"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/Random.ts"
import { Transform } from "#lib/common/Transform.svelte.ts"
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
		// The battle starts in no state; `start()` enters the first.
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
	/** The game's random numbers, which last from one battle to the next (default: new ones). */
	random?: Random
	/**
	 * Spawns the battle's units in place of `InitBattleState`'s test units (three heroes and three
	 * enemies on random tiles). For tests that need particular units in particular places.
	 */
	spawnTestUnits?: ((battle: BattleController) => void) | null
	/** Starts the battle over, from scratch. `EndBattleState` calls it. */
	loadLevel?: (() => void) | null
}

/**
 * Port of `Controller/BattleController.cs` and its `StateMachine` base class: the battle's state
 * machine (`runic-svelte-fsm`) and everything its states share.
 */
export class BattleController {
	/** What the battle's objects post and observe. */
	readonly notifications = new NotificationCenter()
	/** The game's random numbers (`BattleOptions.random`). */
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
	/** Plans the turns of computer-driven units. */
	readonly cpu: ComputerPlayer
	/** The category picked in `CategorySelectionState`, for `ActionSelectionState`. */
	actionSelectionCategory = 0
	/** Knocks out units with no HP left. */
	readonly autoStatusController: AutoStatusController
	/** How the battle is won or lost, which `InitBattleState` sets. */
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

	/** Starts the battle: leaves the initial `None` state. */
	start(): void {
		this.machine.start()
	}

	/** A direction from the input, for the current state. */
	move(direction: Point): void {
		if (this.#listening()) this.machine.move(direction)
	}

	/** A released Fire button (0 confirm, 1 cancel), for the current state. */
	fire(button: number): void {
		if (this.#listening()) this.machine.fire(button)
	}

	/**
	 * Whether the current state listens to the input: unless the computer drives the turn's actor.
	 * No driver changes during a state.
	 */
	#listening(): boolean {
		// The outro must be read past even when a computer-driven unit's action ended the battle.
		if (this.machine.current === "CutSceneState") return true

		const driver = this.turn.actor?.driver ?? null
		return driver === null || driver.current === Drivers.Human
	}
}

export const [getBattleController, setBattleController] = createContext<BattleController>()
