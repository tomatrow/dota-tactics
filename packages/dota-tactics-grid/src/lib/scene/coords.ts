import type { MapModel } from "#lib/map/model.ts"

/**
 * Scene space: 1 unit = 1 tile (64 game units), Y up. The board is centred on the origin with east
 * along +X and north along -Z, so tile (col, row) spans X ∈ [col - cols/2, col + 1 - cols/2] and
 * Z ∈ [rows/2 - row - 1, rows/2 - row]. Heights are game units / cell, times the vertical scale.
 */
export const sceneX = (model: MapModel, x: number) =>
	(x - model.originX) / model.cell - model.cols / 2
export const sceneZ = (model: MapModel, y: number) =>
	model.rows / 2 - (y - model.originY) / model.cell
export const sceneY = (model: MapModel, z: number, verticalScale: number) =>
	(z / model.cell) * verticalScale

export const tileX = (model: MapModel, col: number) => col + 0.5 - model.cols / 2
export const tileZ = (model: MapModel, row: number) => model.rows / 2 - row - 0.5

/** The bottom of the board's side walls, in game units: a little below the lowest ground. */
export const floorHeight = (model: MapModel) => model.minHeight - 3 * model.cell
