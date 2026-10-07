import { MathUtils } from "three"

/** Euler angles in radians plus rotation order, as accepted by Threlte's `rotation` prop. */
export type EulerTuple = [x: number, y: number, z: number, order: "YXZ"]

/**
 * Converts a Unity `localEulerAngles` value (degrees, applied Z then X then Y) to three.
 *
 * Unity objects in this port live inside `<UnityWorld>`, so Unity's numbers can be used as-is;
 * only the units (degrees → radians) and rotation order need translating.
 */
export function unityEuler(x: number, y: number, z: number): EulerTuple {
	return [MathUtils.degToRad(x), MathUtils.degToRad(y), MathUtils.degToRad(z), "YXZ"]
}
