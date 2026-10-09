import { Resources, type Resource, type ResourcePath } from "#lib/common/Resources.ts"
import { Drivers } from "#lib/enums/Drivers.ts"
import { Locomotions } from "#lib/enums/Locomotions.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Alliances } from "#lib/enums/Alliances.ts"
import type { Ability } from "#lib/view-model-component/ability/Ability.ts"
import { AbilityCatalog } from "#lib/view-model-component/ability/AbilityCatalog.ts"
import {
	instantiateAbility,
	type AbilityPrefabContext
} from "#lib/view-model-component/ability/AbilityPrefab.ts"
import { instantiateAttackPattern } from "#lib/view-model-component/ai/AttackPatternPrefab.ts"
import { Alliance } from "#lib/view-model-component/actor/Alliance.ts"
import { Driver } from "#lib/view-model-component/actor/Driver.ts"
import { Health } from "#lib/view-model-component/actor/Health.ts"
import { Job } from "#lib/view-model-component/actor/Job.ts"
import { Mana } from "#lib/view-model-component/actor/Mana.ts"
import { FlyMovement } from "#lib/view-model-component/movement/FlyMovement.ts"
import { TeleportMovement } from "#lib/view-model-component/movement/TeleportMovement.ts"
import { WalkMovement } from "#lib/view-model-component/movement/WalkMovement.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import type { UnitRecipe } from "./UnitRecipe.ts"

/** What building a unit needs of its battle. */
export type UnitFactoryContext = AbilityPrefabContext

/**
 * Port of `Factory/UnitFactory.cs`: builds a unit from a recipe, adding its components in an order
 * that lets each set itself up from the ones before. The recipe's model is the unit's `model`,
 * which `<UnitView>` renders.
 */
export const UnitFactory = {
	/**
	 * A unit at `level` from `recipe`, or from the `Unit Recipes/` resource it names (`null`, with
	 * an error logged, if there is none).
	 */
	create(recipe: string | UnitRecipe, level: number, context: UnitFactoryContext): Unit | null {
		if (typeof recipe === "string") {
			const loaded = Resources.load(`Unit Recipes/${recipe}`)
			if (loaded === null) {
				console.error(`No Unit Recipe for name: ${recipe}`)
				return null
			}
			recipe = loaded
		}

		const obj = new Unit({
			name: recipe.name,
			model: recipe.model,
			notifications: context.notifications
		})
		addStats(obj)
		addLocomotion(obj, recipe.locomotion)
		// `Status` and `Equipment`: every `Unit` has them.
		addJob(obj, recipe.job, context)
		addRank(obj, level)
		obj.health = new Health(obj.stats, context.notifications)
		obj.mana = new Mana(obj, context.notifications)
		addAttack(obj, recipe.attack, context)
		addAbilityCatalog(obj, recipe.abilityCatalog, context)
		addAlliance(obj, recipe.alliance)
		addAttackPattern(obj, recipe.strategy, context)
		return obj
	}
}

/** The prefab at `path`; throws if there is none. */
function instantiatePrefab<P extends ResourcePath>(path: P): Resource<P> {
	const prefab = Resources.load(path)
	if (prefab === null) throw new Error(`No Prefab for name: ${path}`)
	return prefab
}

function addStats(obj: Unit): void {
	obj.stats.setValue(StatTypes.LVL, 1, false)
}

function addJob(obj: Unit, name: string, context: UnitFactoryContext): void {
	const job = new Job(instantiatePrefab(`Jobs/${name}`), context)
	obj.job = job
	job.employ(obj)
	job.loadDefaultStats()
}

function addLocomotion(obj: Unit, type: Locomotions): void {
	switch (type) {
		case Locomotions.Walk:
			obj.movement = new WalkMovement(obj)
			break
		case Locomotions.Fly:
			obj.movement = new FlyMovement(obj)
			break
		case Locomotions.Teleport:
			obj.movement = new TeleportMovement(obj)
			break
	}
}

function addAlliance(obj: Unit, type: Alliances): void {
	obj.alliance = new Alliance(type)
}

function addRank(obj: Unit, level: number): void {
	obj.rank.init(level)
}

function addAttack(obj: Unit, name: string, context: UnitFactoryContext): void {
	obj.attack = instantiateAbility(instantiatePrefab(`Abilities/${name}`), obj, context)
}

function addAbilityCatalog(obj: Unit, name: string, context: UnitFactoryContext): void {
	const recipe = Resources.load(`Ability Catalog Recipes/${name}`)
	if (recipe === null) {
		console.error(`No Ability Catalog Recipe Found: ${name}`)
		obj.abilityCatalog = new AbilityCatalog([])
		return
	}

	obj.abilityCatalog = new AbilityCatalog(
		recipe.categories.map((category) => ({
			name: category.name,
			abilities: category.entries.map((entry): Ability => {
				const prefab = instantiatePrefab(`Abilities/${category.name}/${entry}`)
				return instantiateAbility(prefab, obj, context)
			})
		}))
	)
}

/** A `Driver`: a person drives a unit with no `strategy`, the computer one with an attack pattern. */
function addAttackPattern(obj: Unit, name: string, context: UnitFactoryContext): void {
	const driver = new Driver()
	obj.driver = driver
	if (name === "") {
		driver.normal = Drivers.Human
	} else {
		driver.normal = Drivers.Computer
		const prefab = instantiatePrefab(`Attack Pattern/${name}`)
		obj.attackPattern = instantiateAttackPattern(prefab, obj, context)
	}
}
