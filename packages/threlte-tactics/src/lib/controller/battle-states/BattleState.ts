import type { TransitionEvent } from "runic-svelte-fsm"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { Alliances } from "#lib/enums/Alliances.ts"
import type { Point } from "#lib/model/Point.ts"
import type { Driver } from "#lib/view-model-component/actor/Driver.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

/**
 * Port of `Controller/Battle States/BattleState.cs`, the base class of every battle state.
 *
 * Each state is a module exporting a factory that takes the owner (`BattleController`) and returns
 * the state's `runic-svelte-fsm` handlers. A handler returns the name of the state to change to, or
 * nothing to stay. The base class's helpers are the functions below.
 */

export type BattleStateName =
	| "AbilityTargetState"
	| "ActionSelectionState"
	| "CategorySelectionState"
	| "CommandSelectionState"
	| "ConfirmAbilityTargetState"
	| "CutSceneState"
	| "EndBattleState"
	| "EndFacingState"
	| "ExploreState"
	| "InitBattleState"
	| "MoveSequenceState"
	| "MoveTargetState"
	| "PerformAbilityState"
	| "SelectUnitState"

/**
 * The actions a battle state may handle. The machine's action types come from the states that
 * handle them; this only keeps every state's handlers consistent (and their returns literal,
 * which the machine checks against its states).
 */
export interface BattleActions {
	/** `BattleController.start()`: leaves the initial `None` state. */
	start(): BattleStateName | void
	/** A direction from the `InputController`. */
	move(direction: Point): BattleStateName | void
	/** The index of a released Fire button (0 confirm, 1 cancel). */
	fire(button: number): BattleStateName | void
	/** The state's own async work finished. */
	done(): BattleStateName | void
}

/** What a battle state module's factory returns. Unhandled actions are no-ops. */
export type BattleStateHandlers = Partial<BattleActions> & {
	_enter?(event: TransitionEvent): void
	_exit?(event: TransitionEvent): void
}

/**
 * Who drives the turn's actor (`null` before the first turn). It doesn't change while a state is
 * current.
 */
export function driver(owner: BattleController): Driver | null {
	return owner.turn.actor?.driver ?? null
}

/** Moves the selection (`pos` and the tile selection indicator) to `p`, if it is on the board. */
export function selectTile(owner: BattleController, p: Point): void {
	const tile = owner.board.tiles.get(p)
	if (owner.pos === p || !tile) return

	owner.pos = p
	owner.tileSelectionIndicator.position = tile.center
}

/** The unit on the tile at `p`, if any. */
export function getUnit(owner: BattleController, p: Point): Unit | null {
	const t = owner.board.getTile(p)
	return t !== null ? t.content : null
}

/** Shows the primary stat panel for the unit at `p`, or hides it if there is none. */
export function refreshPrimaryStatPanel(owner: BattleController, p: Point): void {
	const target = getUnit(owner, p)
	if (target !== null) owner.statPanelController.showPrimary(target)
	else owner.statPanelController.hidePrimary()
}

/** Shows the secondary stat panel for the unit at `p`, or hides it if there is none. */
export function refreshSecondaryStatPanel(owner: BattleController, p: Point): void {
	const target = getUnit(owner, p)
	if (target !== null) owner.statPanelController.showSecondary(target)
	else owner.statPanelController.hideSecondary()
}

/** Whether the heroes won the battle. */
export function didPlayerWin(owner: BattleController): boolean {
	return owner.victoryCondition!.victor === Alliances.Hero
}

/** Whether the battle has been decided. */
export function isBattleOver(owner: BattleController): boolean {
	return owner.victoryCondition!.victor !== Alliances.None
}
