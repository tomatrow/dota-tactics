import type { AbilityId } from "#lib/content/abilities.ts"

/**
 * A player's command to their hero. Plain data, units by id: a game replays from its seed and its
 * (tick, hero, command) log, the hook networking needs (DESIGN.md §11).
 */
export type Command =
	| { readonly type: "stop" }
	| { readonly type: "move"; readonly col: number; readonly row: number }
	/** On an enemy, attacks it; on an own creep under the deny threshold, denies it; else moves to it. */
	| { readonly type: "attack"; readonly target: number }
	| { readonly type: "attackMove"; readonly col: number; readonly row: number }
	| { readonly type: "ability"; readonly ability: AbilityId; readonly target: number | null }
