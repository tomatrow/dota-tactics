import { Resources } from "#lib/common/unity/Resources.ts"
import { nextFrame } from "#lib/common/unity/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { TurnOrderController } from "#lib/controller/TurnOrderController.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Point } from "#lib/model/Point.ts"
import { AbilityCatalog } from "#lib/view-model-component/ability/AbilityCatalog.ts"
import { instantiateAbility } from "#lib/view-model-component/ability/AbilityPrefab.ts"
import { Health } from "#lib/view-model-component/actor/Health.ts"
import { Job, type JobPrefab } from "#lib/view-model-component/actor/Job.ts"
import { Mana } from "#lib/view-model-component/actor/Mana.ts"
import { WalkMovement } from "#lib/view-model-component/movement/WalkMovement.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { selectTile, type BattleStateHandlers } from "./BattleState.ts"
import * as heroAbilities from "./heroAbilities.ts"

/** Port of `Controller/Battle States/InitBattleState.cs`: builds the battle, then hands over. */
export function initBattleState(owner: BattleController) {
	async function init(): Promise<void> {
		owner.board.load(owner.levelData)
		const [x, , z] = owner.levelData.tiles[0]!
		selectTile(owner, Point.of(Math.trunc(x), Math.trunc(z)))
		spawnTestUnits()
		owner.round = new TurnOrderController(owner).round()
		// Unity can't change state during a transition (`Enter`), so it waits a frame.
		await nextFrame()
		owner.machine.done()
	}

	// TODO(part 21): spawn the recipes' units instead of one hero per job.
	function spawnTestUnits(): void {
		const jobs = ["Rogue", "Warrior", "Wizard"]
		for (let i = 0; i < jobs.length; ++i) {
			const unit = new Unit({
				name: jobs[i]!,
				model: "Hero",
				notifications: owner.notifications
			})

			unit.stats.set(StatTypes.LVL, 1)

			const jobPrefab = Resources.load<JobPrefab>(`Jobs/${jobs[i]}`)!
			const job = new Job(jobPrefab, owner)
			unit.job = job
			job.employ(unit)
			job.loadDefaultStats()

			const [x, , z] = owner.levelData.tiles[i]!
			const p = Point.of(Math.trunc(x), Math.trunc(z))

			unit.place(owner.board.getTile(p))
			unit.match()

			unit.movement = new WalkMovement(unit)

			unit.attack = instantiateAbility(heroAbilities.attack, unit, owner)
			unit.abilityCatalog = new AbilityCatalog(
				heroAbilities.abilityCatalog.map(({ name, abilities }) => ({
					name,
					abilities: abilities.map((prefab) => instantiateAbility(prefab, unit, owner))
				}))
			)

			owner.units.push(unit)

			unit.rank.init(10)

			unit.health = new Health(unit.stats, owner.notifications)
			unit.mana = new Mana(unit, owner.notifications)
		}
	}

	return {
		_enter() {
			void init()
		},
		done: () => "CutSceneState"
	} satisfies BattleStateHandlers
}
