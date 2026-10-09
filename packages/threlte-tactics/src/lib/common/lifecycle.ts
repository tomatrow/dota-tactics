/** Something that works while it's enabled (observing notifications, say): `disable()` stops it. */
export interface Behaviour {
	disable(): void
}

/**
 * Disables `component` once the code running now has finished (in a microtask), so it keeps
 * working until then: a status effect removed as a round begins still works through the rounds
 * the turn order plays before the next turn.
 */
export function disableLater(component: Behaviour): void {
	queueMicrotask(() => component.disable())
}
