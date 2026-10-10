import { Facing } from "#lib/sim/grid.ts"
import type { Vec3 } from "./camera.ts"

/**
 * The yaw (radians about +Y) that turns a model whose front is −Z (north at yaw 0) to face a
 * direction. Scene north is −Z, east +X.
 */
export function facingYaw(facing: Facing): number {
	switch (facing) {
		case Facing.north:
			return 0
		case Facing.east:
			return -Math.PI / 2
		case Facing.south:
			return Math.PI
		case Facing.west:
			return Math.PI / 2
	}
}

/** How long (game seconds) a melee lunge lasts. */
export const LUNGE_TIME = 0.2

/**
 * How far forward (tiles) a melee attacker's body is `age` game seconds after it attacked: out and
 * back over LUNGE_TIME, still otherwise.
 */
export function lunge(age: number, distance = 0.35): number {
	if (age < 0 || age >= LUNGE_TIME) return 0
	return Math.sin((Math.PI * age) / LUNGE_TIME) * distance
}

/**
 * Where a projectile is, `t` (0–1) of the way from `from` to `to`, arcing `arc` tiles above the
 * straight line at its middle.
 */
export function projectileAt(from: Vec3, to: Vec3, t: number, arc: number): Vec3 {
	const k = Math.max(0, Math.min(1, t))
	return [
		from[0] + (to[0] - from[0]) * k,
		from[1] + (to[1] - from[1]) * k + Math.sin(Math.PI * k) * arc,
		from[2] + (to[2] - from[2]) * k
	]
}
