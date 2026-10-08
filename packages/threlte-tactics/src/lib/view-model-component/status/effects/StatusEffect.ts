import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import type { Behaviour } from "#lib/common/unity/Object.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import type { Status } from "#lib/view-model-component/status/Status.ts"

/** A `StatusEffect` subclass, which `Status` creates for a unit. */
export type StatusEffectType<T extends StatusEffect = StatusEffect> = new (status: Status) => T

/**
 * Port of `View Model Component/Status/Effects/StatusEffect.cs`: something a status does to its
 * unit, while any of its conditions lasts. Subclasses start in `onEnable` (called once `Status`
 * adds them) and stop in `onDisable` (once `Status` destroys them).
 */
export abstract class StatusEffect implements Behaviour {
	/** The unit the effect is on (Unity: `GetComponentInParent<Unit>()`). */
	protected readonly owner: Unit
	protected readonly notifications: NotificationCenter

	constructor(status: Status) {
		this.owner = status.owner
		this.notifications = status.notifications
	}

	onEnable(): void {}
	onDisable(): void {}
}
