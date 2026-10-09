import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { StatTypes, statTypeName, type StatTypeName } from "#lib/enums/StatTypes.ts"
import { ValueChangeException } from "#lib/exceptions/ValueChangeException.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

type StatsNotifications = {
	/** Posted before a stat changes through `set`; listeners may block or modify the change. */
	[S in StatTypeName as `Stats.${S}WillChange`]: [sender: Stats, exc: ValueChangeException]
} & {
	/** Posted after a stat changed, with its old value. */
	[S in StatTypeName as `Stats.${S}DidChange`]: [sender: Stats, oldValue: number]
}

declare module "#lib/common/notification-center/NotificationCenter.ts" {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Adds Stats' notifications.
	interface Notifications extends StatsNotifications {}
}

/**
 * Port of `View Model Component/Actor/Stats.cs`: a unit's stats (whole numbers, indexed by
 * `StatTypes`), with notifications before and after each change.
 */
export class Stats {
	static willChangeNotification<T extends StatTypes>(type: T) {
		return `Stats.${statTypeName(type)}WillChange` as const
	}

	static didChangeNotification<T extends StatTypes>(type: T) {
		return `Stats.${statTypeName(type)}DidChange` as const
	}

	readonly #data: number[] = new Array<number>(StatTypes.Count).fill(0)
	readonly #notifications: NotificationCenter
	/** The unit whose stats these are, if any. */
	readonly unit: Unit | null

	constructor(notifications: NotificationCenter, unit: Unit | null = null) {
		this.#notifications = notifications
		this.unit = unit
	}

	/** The value of a stat. */
	get(type: StatTypes): number {
		return this.#data[type]!
	}

	/** Changes a stat, letting observers adjust or veto the change. */
	set(type: StatTypes, value: number): void {
		this.setValue(type, value, true)
	}

	setValue(type: StatTypes, value: number, allowExceptions: boolean): void {
		const oldValue = this.get(type)
		if (oldValue === value) return

		if (allowExceptions) {
			// Allow exceptions to the rule here
			const exc = new ValueChangeException(oldValue, value)

			// The notification is unique per stat type
			this.#notifications.postNotification(Stats.willChangeNotification(type), this, exc)

			// Did anything modify the value?
			value = Math.floor(exc.getModifiedValue())

			// Did something nullify the change?
			if (!exc.toggle || value === oldValue) return
		}

		this.#data[type] = value
		this.#notifications.postNotification(Stats.didChangeNotification(type), this, oldValue)
	}
}
