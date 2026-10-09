import { nextFrame } from "#lib/common/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { TurnOrderController } from "#lib/controller/TurnOrderController.ts"
import { DefeatTargetVictoryCondition } from "#lib/controller/victory-conditions/DefeatTargetVictoryCondition.ts"
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
		addVictoryCondition()
		owner.round = new TurnOrderController(owner).round()
		// Hand over a frame later: a state doesn't change state while it is being entered.
		await nextFrame()
		owner.machine.done()
	}

	/** Three heroes and three enemies, at random levels, on random tiles, facing random ways. */
	function spawnTestUnits(): void {
		const recipes = ["Alaois", "Hania", "Kamau", "Enemy Rogue", "Enemy Warrior", "Enemy Wizard"]

		const locations = [...owner.board.tiles.values()]
		for (let i = 0; i < recipes.length; ++i) {
			const level = owner.random.int(9, 12)
			const unit = UnitFactory.create(recipes[i]!, level, owner)!

			const random = owner.random.int(0, locations.length)
			const randomTile = locations[random]!
			locations.splice(random, 1)

			unit.place(randomTile)
			unit.dir = owner.random.int(0, 4) as Directions
			unit.match()

			owner.units.push(unit)
		}

		selectTile(owner, owner.units[0]!.tile!.pos)
	}

	/** The heroes win by defeating the last enemy, who escapes with 10 HP left. */
	function addVictoryCondition(): void {
		const vc = new DefeatTargetVictoryCondition(owner)
		owner.victoryCondition = vc
		const enemy = owner.units[owner.units.length - 1]!
		vc.target = enemy
		const health = enemy.health!
		health.minHP = 10
	}

	return {
		_enter() {
			void init()
		},
		done: () => "CutSceneState"
	} satisfies BattleStateHandlers
}
