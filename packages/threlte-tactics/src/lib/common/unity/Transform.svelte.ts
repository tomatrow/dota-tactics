import type { Vector3 } from "./vector3.ts"

/**
 * The parts of a Unity `Transform` that game rules move directly (as opposed to a view's own
 * animation). Views render from it.
 */
export class Transform {
	localPosition = $state.raw<Vector3>([0, 0, 0])
}
