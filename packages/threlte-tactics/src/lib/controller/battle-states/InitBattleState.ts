import { Resources } from "#lib/common/unity/Resources.ts"
import { nextFrame } from "#lib/common/unity/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Point } from "#lib/model/Point.ts"
import { Ability } from "#lib/view-model-component/ability/Ability.ts"
import { SpecifyAbilityArea } from "#lib/view-model-component/ability/area-of-effect/SpecifyAbilityArea.ts"
import { DefaultAbilityEffectTarget } from "#lib/view-model-component/ability/effect-target/DefaultAbilityEffectTarget.ts"
import { ConstantAbilityRange } from "#lib/view-model-component/ability/range/ConstantAbilityRange.ts"
import { Job, type JobPrefab } from "#lib/view-model-component/actor/Job.ts"
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

	// TODO(part 21): spawn the recipes' units instead of one hero per job.
	function spawnTestUnits(): void {
		const jobs = ["Rogue", "Warrior", "Wizard"]
		for (let i = 0; i < jobs.length; ++i) {
			// Unity's `Instantiate` names the copy "Hero(Clone)".
			const unit = new Unit({
				name: "Hero(Clone)",
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

			// The blog's Hero prefab gained an "Attack" child to demo ability ranges and areas (its
			// effect target is on the "Attack" object itself).
			unit.attack = new Ability({
				name: "Attack",
				range: new ConstantAbilityRange(unit, { horizontal: 3 }),
				area: new SpecifyAbilityArea({ horizontal: 1, vertical: 1 }),
				effects: [{ name: "Attack", target: new DefaultAbilityEffectTarget() }]
			})

			owner.units.push(unit)

			unit.rank.init(10)
		}
	}

	return {
		_enter() {
			void init()
		},
		done: () => "CutSceneState"
	} satisfies BattleStateHandlers
}
