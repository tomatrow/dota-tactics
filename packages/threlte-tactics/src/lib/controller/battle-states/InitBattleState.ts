import { nextFrame } from "#lib/common/unity/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { Point } from "#lib/model/Point.ts"
import { FlyMovement } from "#lib/view-model-component/movement/FlyMovement.ts"
import { TeleportMovement } from "#lib/view-model-component/movement/TeleportMovement.ts"
import { WalkMovement } from "#lib/view-model-component/movement/WalkMovement.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"

/** Port of `Controller/Battle States/InitBattleState.cs`: builds the battle, then hands over. */
export function initBattleState(owner: BattleController) {
	async function init(): Promise<void> {
		owner.board.load(owner.levelData)
		const [x, , z] = owner.levelData.tiles[0]!
		selectTile(owner, Point.of(Math.trunc(x), Math.trunc(z)))
		spawnTestUnits()
		// Unity can't change state during a transition (`Enter`), so it waits a frame.
		await nextFrame()
		owner.machine.done()
	}

	// TODO(part 21): spawn the recipes' units instead of one hero per movement type.
	function spawnTestUnits(): void {
		const components = [WalkMovement, FlyMovement, TeleportMovement]
		for (let i = 0; i < 3; ++i) {
			const unit = new Unit({ name: "Hero", model: "Hero" })

			const [x, , z] = owner.levelData.tiles[i]!
			const p = Point.of(Math.trunc(x), Math.trunc(z))

			unit.place(owner.board.getTile(p))
			unit.match()

			const m = new components[i]!(unit)
			unit.movement = m
			m.range = 5
			m.jumpHeight = 1

			owner.units.push(unit)
		}
	}

	return {
		_enter() {
			void init()
		},
		done: () => "CutSceneState"
	} satisfies BattleStateHandlers
}
