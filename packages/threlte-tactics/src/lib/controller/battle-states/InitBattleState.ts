import { nextFrame } from "#lib/common/unity/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { TurnOrderController } from "#lib/controller/TurnOrderController.ts"
import type { Directions } from "#lib/enums/Directions.ts"
import { UnitFactory } from "#lib/factory/UnitFactory.ts"
import { Point } from "#lib/model/Point.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"

/** Port of `Controller/Battle States/InitBattleState.cs`: builds the battle, then hands over. */
export function initBattleState(owner: BattleController) {
	async function init(): Promise<void> {
		owner.board.load(owner.levelData)
		const [x, , z] = owner.levelData.tiles[0]!
		selectTile(owner, Point.of(Math.trunc(x), Math.trunc(z)))
		if (owner.spawnTestUnits) owner.spawnTestUnits(owner)
		else spawnTestUnits()
		// TODO(part 22): addVictoryCondition()
		owner.round = new TurnOrderController(owner).round()
		// Unity can't change state during a transition (`Enter`), so it waits a frame.
		await nextFrame()
		owner.machine.done()
	}

	/** Three heroes and three enemies, at random levels, on random tiles, facing random ways. */
	function spawnTestUnits(): void {
		const recipes = ["Alaois", "Hania", "Kamau", "Enemy Rogue", "Enemy Warrior", "Enemy Wizard"]

		const locations = [...owner.board.tiles.values()]
		for (let i = 0; i < recipes.length; ++i) {
			const level = owner.random.rangeInt(9, 12)
			const unit = UnitFactory.create(recipes[i]!, level, owner)!

			const random = owner.random.rangeInt(0, locations.length)
			const randomTile = locations[random]!
			locations.splice(random, 1)

			unit.place(randomTile)
			unit.dir = owner.random.rangeInt(0, 4) as Directions
			unit.match()

			owner.units.push(unit)
		}

		selectTile(owner, owner.units[0]!.tile!.pos)
	}

	return {
		_enter() {
			void init()
		},
		done: () => "CutSceneState"
	} satisfies BattleStateHandlers
}
