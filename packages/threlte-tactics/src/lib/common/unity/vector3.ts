/**
 * A Unity `Vector3` as a plain tuple: what Threlte's `position`/`scale` props and `svelte/motion`'s
 * `Tween` both accept. Coordinates are Unity's (see `<UnityWorld>`).
 */
export type Vector3 = [x: number, y: number, z: number]
