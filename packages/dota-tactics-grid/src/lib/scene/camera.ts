/** Where the camera looks from at home: the south-west (Radiant's corner), looking north-east. */
export const HOME_TARGET: [number, number, number] = [0, 2, 0]
const HOME_DIRECTION = [-1, 1.25, 1].map((v, _, a) => v / Math.hypot(...a))
const CAMERA_DISTANCE = 1200
export const HOME_POSITION = HOME_DIRECTION.map((v, k) => HOME_TARGET[k] + v * CAMERA_DISTANCE) as [
	number,
	number,
	number
]

/** The smallest half-extents (tiles) of the view at zoom 1: the whole board fits. */
const MIN_HALF_WIDTH = 215
const MIN_HALF_HEIGHT = 150

/** The orthographic camera's half-extents (tiles) at zoom 1 for a viewport of this size. */
export function frustum(width: number, height: number): { halfWidth: number; halfHeight: number } {
	const aspect = width / height
	const halfWidth = Math.max(MIN_HALF_WIDTH, MIN_HALF_HEIGHT * aspect)
	return { halfWidth, halfHeight: halfWidth / aspect }
}

/** How many CSS pixels a tile spans on screen at this zoom. */
export function tilePixels(width: number, height: number, zoom: number): number {
	const h = Math.max(1, height)
	return (h / (2 * frustum(Math.max(1, width), h).halfHeight)) * zoom
}

const QUARTER = Math.PI / 2

/**
 * The azimuth a quarter turn (FFT-style) from `azimuth`: the nearest diagonal, then 90° on.
 * Azimuths are three's spherical theta about +Y, measured from +Z.
 */
export function quarterTurn(azimuth: number, direction: 1 | -1): number {
	const snapped = Math.round((azimuth - QUARTER / 2) / QUARTER) * QUARTER + QUARTER / 2
	return snapped + direction * QUARTER
}
