// Port of the `Materials/*.mat` assets. They all use Unity's Standard shader, which maps onto
// three's MeshStandardMaterial with `roughness = 1 - smoothness`. The colors are the sRGB values
// from the `.mat` files (the project renders in gamma space).
import type { MeshStandardMaterialParameters } from "three"

export const Materials = {
	Ally: { color: "#56c858", roughness: 0.75, metalness: 0 },
	Default: { color: "#808080", roughness: 0.5, metalness: 0 },
	// Also gets the Dirt texture as its `map`; see `Tile.svelte`.
	Dirt: { color: "#ffffff", roughness: 1, metalness: 0 },
	Enemy: { color: "#b72b3d", roughness: 0.75, metalness: 0 },
	Eyes: { color: "#ffffff", roughness: 0.5, metalness: 0 },
	Selection: { color: "#ffff00", roughness: 0.5, metalness: 0 }
} as const satisfies Record<string, MeshStandardMaterialParameters>

export type MaterialName = keyof typeof Materials
