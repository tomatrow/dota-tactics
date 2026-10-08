/** A component that does something while it's enabled: `onDisable` stops it. */
export interface Behaviour {
	onDisable(): void
}

/**
 * Unity's `Object.Destroy`: the component is destroyed (and `OnDisable` runs) at the end of the
 * frame, so it keeps working until the code running now finishes, e.g. through every round the
 * turn order plays before the next turn. The port disables it in a microtask: after the current
 * synchronous code, before any later frame's.
 */
export function destroy(component: Behaviour): void {
	queueMicrotask(() => component.onDisable())
}
