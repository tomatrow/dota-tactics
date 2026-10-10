import { HOME_POSITION, HOME_TARGET } from "dota-tactics-grid/scene/camera.ts"

/** Scene coordinates (1 unit = 1 tile, Y up, north is −Z). */
export type Vec3 = [x: number, y: number, z: number]

/** The camera's offset from what it looks at: the board viewer's home angle (from the south-west). */
export const CAMERA_OFFSET = HOME_POSITION.map((v, k) => v - HOME_TARGET[k]) as Vec3

/** The camera's fixed angle from straight down, in radians: the view only turns about Y. */
export const CAMERA_POLAR = Math.acos(CAMERA_OFFSET[1] / Math.hypot(...CAMERA_OFFSET))

/** The zoom the game starts at: about 30 tiles top to bottom on a 16:9 screen. */
export const GAME_ZOOM = 10

/** How close (CSS px) the pointer must be to the screen's edge to pan. */
export const EDGE_MARGIN = 12

/** Edge panning crosses this many screen-heights per second, whatever the zoom. */
export const EDGE_PAN_RATE = 0.9

/**
 * The ground-plane directions that look right and up on screen for a camera at `azimuth` (three's
 * spherical theta about +Y, measured from +Z), as [x, z] unit vectors.
 */
export function groundAxes(azimuth: number): {
	right: [x: number, z: number]
	forward: [x: number, z: number]
} {
	const sin = Math.sin(azimuth)
	const cos = Math.cos(azimuth)
	return { right: [cos, -sin], forward: [-sin, -cos] }
}

/**
 * Which way to pan for a pointer at (x, y) CSS px in a `width` × `height` view: −1, 0 or 1 on
 * each axis, with +y meaning up the screen.
 */
export function edgeDirection(
	x: number,
	y: number,
	width: number,
	height: number,
	margin: number = EDGE_MARGIN
): [x: number, y: number] {
	const dx =
		x <= margin ? -1
		: x >= width - margin ? 1
		: 0
	const dy =
		y <= margin ? 1
		: y >= height - margin ? -1
		: 0
	return [dx, dy]
}
