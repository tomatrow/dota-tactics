/**
 * A 3D vector as a plain tuple: what Threlte's `position`/`scale` props and `svelte/motion`'s
 * `Tween` both accept. In world space, three's axes (see `Tile`).
 */
export type Vector3 = [x: number, y: number, z: number]
