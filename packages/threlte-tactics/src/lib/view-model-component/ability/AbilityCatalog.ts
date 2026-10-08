import type { Ability } from "./Ability.ts"

/** One of a catalog's child GameObjects: a category, named, of abilities (its children). */
export interface AbilityCategory {
	readonly name: string
	readonly abilities: readonly Ability[]
}

/**
 * Port of `View Model Component/Ability/AbilityCatalog.cs`: a unit's abilities, by category.
 * Unity's catalog is a GameObject whose children are the categories, and theirs the abilities.
 */
export class AbilityCatalog {
	readonly categories: readonly AbilityCategory[]

	constructor(categories: readonly AbilityCategory[]) {
		this.categories = categories
	}

	categoryCount(): number {
		return this.categories.length
	}

	getCategory(index: number): AbilityCategory | null {
		if (index < 0 || index >= this.categories.length) return null
		return this.categories[index]!
	}

	abilityCount(category: AbilityCategory | null): number {
		return category !== null ? category.abilities.length : 0
	}

	getAbility(categoryIndex: number, abilityIndex: number): Ability | null {
		const category = this.getCategory(categoryIndex)
		if (category === null || abilityIndex < 0 || abilityIndex >= category.abilities.length)
			return null
		return category.abilities[abilityIndex]!
	}
}
