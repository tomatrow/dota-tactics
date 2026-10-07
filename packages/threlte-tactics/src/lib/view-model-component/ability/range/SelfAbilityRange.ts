import type { Board } from "#lib/view-model-component/Board.svelte.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import { AbilityRange } from "./AbilityRange.ts"

/** Port of `View Model Component/Ability/Range/SelfAbilityRange.cs`: only the user's tile. */
export class SelfAbilityRange extends AbilityRange {
	override get positionOriented(): boolean {
		return false
	}

	override getTilesInRange(_board: Board): Tile[] {
		return [this.unit.tile!]
	}
}
