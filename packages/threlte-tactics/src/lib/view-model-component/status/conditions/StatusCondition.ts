import type { Behaviour } from "#lib/common/unity/Object.ts"
import type { Status } from "#lib/view-model-component/status/Status.ts"

/** A `StatusCondition` subclass, which `Status` creates for a status effect. */
export type StatusConditionType<U extends StatusCondition = StatusCondition> = new (
	status: Status
) => U

/**
 * Port of `View Model Component/Status/Conditions/StatusCondition.cs`: one reason a status effect
 * stays on its unit. This one is "manual": whatever added it removes it. Subclasses remove
 * themselves (`onEnable` and `onDisable` work as for `StatusEffect`).
 */
export class StatusCondition implements Behaviour {
	protected readonly status: Status

	constructor(status: Status) {
		this.status = status
	}

	onEnable(): void {}
	onDisable(): void {}

	remove(): void {
		// Unity: `GetComponentInParent<Status>()`, which a removed (unparented) condition doesn't find.
		if (this.status.has(this)) this.status.remove(this)
	}
}
