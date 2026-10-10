import type { MeshStandardMaterial } from "three"
import type { UnitStats } from "#lib/content/units.ts"
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

/** How high (tiles) above its feet a unit's body centre is: where it's picked, and hit. */
export function bodyHeight(stats: UnitStats): number {
	switch (stats.kind) {
		case "hero":
			return 0.95
		case "ranged":
			return 1
		case "sentinel":
			return 3.2
		default:
			return 0.6
	}
}

/** How far (tiles) from its body's centre on screen a unit can be picked. */
export const pickRadius = (stats: UnitStats): number =>
	stats.kind === "hero" || stats.kind === "siege" ? 0.65 : 0.45

/** An angle (radians) turned `t` (0–1) of the way to another, the short way round. */
export function turnToward(from: number, to: number, t: number): number {
	const turn = ((((to - from + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI
	return from + turn * t
}

/** The glow of a body that's been hit, and of one that's chilled. */
const FLASH_GLOW = { colour: 0xffffff, intensity: 0.9 }
const CHILL_GLOW = { colour: 0x6cc4ff, intensity: 0.5 }

/** Lights a unit's body (a material with emissive) white while a hit flashes, else ice blue while chilled. */
export function tintBody(material: MeshStandardMaterial, flashing: boolean, chilled: boolean) {
	const glow =
		flashing ? FLASH_GLOW
		: chilled ? CHILL_GLOW
		: null
	material.emissiveIntensity = glow?.intensity ?? 0
	if (glow) material.emissive.setHex(glow.colour)
}
