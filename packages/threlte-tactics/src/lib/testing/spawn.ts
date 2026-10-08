import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { selectTile } from "#lib/controller/battle-states/BattleState.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { UnitFactory } from "#lib/factory/UnitFactory.ts"
import type { Point } from "#lib/model/Point.ts"

/** A unit for `spawn` to put on the board: its recipe, and where. */
export interface TestUnit {
	recipe: string
	at: Point
	/** Default: 10. */
	level?: number
	/** Default: north. */
	dir?: Directions
}

/**
 * A `spawnTestUnits` for `BattleController`: these units, in this order (`battle.units`), then
 * selects the first one's tile, as `InitBattleState`'s does.
 */
export function spawn(...units: TestUnit[]): (battle: BattleController) => void {
	return (battle) => {
		for (const { recipe, at, level = 10, dir = Directions.North } of units) {
			const unit = UnitFactory.create(recipe, level, battle)!
			unit.place(battle.board.getTile(at))
			unit.dir = dir
			unit.match()
			battle.units.push(unit)
		}
		selectTile(battle, battle.units[0]!.tile!.pos)
	}
}
