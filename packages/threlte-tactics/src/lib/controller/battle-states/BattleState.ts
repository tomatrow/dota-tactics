import type { TransitionEvent } from "runic-svelte-fsm"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Point } from "#lib/model/Point.ts"

/**
 * Port of `Controller/Battle States/BattleState.cs`, the base class of every battle state.
 *
 * Each Unity state is a module exporting a factory that takes the owner (`BattleController`) and
 * returns the state's `runic-svelte-fsm` handlers. Unity's virtual methods become actions; a
 * handler returns the name of the state to change to (Unity's `owner.ChangeState<T>()`), or
 * nothing to stay. The base class's helpers are the functions below.
 */

export type BattleStateName =
	| "ActionSelectionState"
	| "CategorySelectionState"
	| "CommandSelectionState"
	| "CutSceneState"
	| "ExploreState"
	| "InitBattleState"
	| "MoveSequenceState"
	| "MoveTargetState"
	| "SelectUnitState"

// A type, not an interface: `fsm` needs handler maps to be assignable to an index signature.
export type BattleActions = {
	/** `BattleController.Start`: leave the initial `None` state. */
	start(): BattleStateName | void
	/** Unity's `OnMove`: a direction from the `InputController`. */
	move(direction: Point): BattleStateName | void
	/** Unity's `OnFire`: the index of a released Fire button (0 confirm, 1 cancel). */
	fire(button: number): BattleStateName | void
	/**
	 * A state's own async work finished. Replaces `owner.ChangeState<T>()` calls at the end of
	 * Unity coroutines.
	 */
	done(): BattleStateName | void
}

/** What a battle state module's factory returns. Unhandled actions fall back to no-ops. */
export type BattleStateHandlers = Partial<BattleActions> & {
	/** Unity's `Enter`. */
	_enter?(event: TransitionEvent): void
	/** Unity's `Exit`. */
	_exit?(event: TransitionEvent): void
}

/** Unity's empty `BattleState` virtuals: the machine's `*` handlers. */
export const defaultBattleActions: BattleActions = {
	start() {},
	move() {},
	fire() {},
	done() {}
}

/** Moves the selection (`pos` and the tile selection indicator) to `p`, if it is on the board. */
export function selectTile(owner: BattleController, p: Point): void {
	const tile = owner.board.tiles.get(p)
	if (owner.pos === p || !tile) return

	owner.pos = p
	owner.tileSelectionIndicator.localPosition = tile.center
}
