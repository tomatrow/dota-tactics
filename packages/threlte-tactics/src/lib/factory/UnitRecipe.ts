import type { UnitModelName } from "#lib/components/prefabs/UnitModel.svelte"
import type { Alliances } from "#lib/enums/Alliances.ts"
import type { Locomotions } from "#lib/enums/Locomotions.ts"

/**
 * Port of `Factory/UnitRecipe.cs`: what `UnitFactory` builds a unit from. The strings name
 * resources (`Units/`, `Jobs/`, `Abilities/`, `Ability Catalog Recipes/`, `Attack Pattern/`).
 * Loaded from `src/lib/resources/Unit Recipes/`.
 */
export interface UnitRecipe {
	/** The asset's name, which the unit is named after. */
	readonly name: string
	readonly model: UnitModelName
	readonly job: string
	readonly attack: string
	readonly abilityCatalog: string
	/** An attack pattern for a computer-driven unit; empty for a human-driven one. */
	readonly strategy: string
	readonly locomotion: Locomotions
	readonly alliance: Alliances
}
