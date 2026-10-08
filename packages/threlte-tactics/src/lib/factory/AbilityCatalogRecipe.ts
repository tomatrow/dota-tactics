/** One of an `AbilityCatalogRecipe`'s categories: its name, and its abilities' names. */
export interface AbilityCatalogRecipeCategory {
	readonly name: string
	readonly entries: readonly string[]
}

/**
 * Port of `Factory/AbilityCatalogRecipe.cs`: the abilities of a unit's catalog, by category, as
 * `Abilities/<category>/<entry>` resource names. Loaded from
 * `src/lib/resources/Ability Catalog Recipes/`.
 */
export interface AbilityCatalogRecipe {
	readonly categories: readonly AbilityCatalogRecipeCategory[]
}
