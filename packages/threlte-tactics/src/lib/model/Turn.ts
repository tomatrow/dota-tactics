import type { Directions } from "#lib/enums/Directions.ts"
import type { Ability } from "#lib/view-model-component/ability/Ability.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

/**
 * Port of `Model/Turn.cs`: the current unit's turn. A move can be undone until the unit acts
 * after it.
 */
// TODO(part 24): the A.I.'s plan.
export class Turn {
	actor: Unit | null = null
	hasUnitMoved = false
	hasUnitActed = false
	lockMove = false
	/** The ability picked from the menus. */
	ability: Ability | null = null
	/** The tiles in the ability's area that it targets. */
	targets: Tile[] = []
	#startTile: Tile | null = null
	#startDir: Directions = 0

	change(current: Unit): void {
		this.actor = current
		this.hasUnitMoved = false
		this.hasUnitActed = false
		this.lockMove = false
		this.#startTile = current.tile
		this.#startDir = current.dir
	}

	undoMove(): void {
		const actor = this.actor!
		this.hasUnitMoved = false
		actor.place(this.#startTile)
		actor.dir = this.#startDir
		actor.match()
	}
}
