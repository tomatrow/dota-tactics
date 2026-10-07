import type { Vector3 } from "#lib/common/unity/vector3.ts"

/**
 * Port of `Model/LevelData.cs`: a saved board. Each tile is `[x, height, z]`, where `height` is
 * measured in steps (see `Tile.stepHeight`).
 */
export interface LevelData {
	tiles: Vector3[]
}
