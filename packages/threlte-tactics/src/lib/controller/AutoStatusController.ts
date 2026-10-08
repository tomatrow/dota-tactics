import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Stats } from "#lib/view-model-component/actor/Stats.ts"
import { StatComparisonCondition } from "#lib/view-model-component/status/conditions/StatComparisonCondition.ts"
import { KnockOutStatusEffect } from "#lib/view-model-component/status/effects/KnockOutStatusEffect.ts"

const hpDidChange = Stats.didChangeNotification(StatTypes.HP)

/**
 * Port of `Controller/AutoStatusController.cs`: knocks out any unit whose HP drop to 0, until
 * they're above 0 again. On the Battle Controller, like Unity's.
 */
export class AutoStatusController {
	readonly #notifications: NotificationCenter

	/** Unity's `OnEnable`. */
	constructor(notifications: NotificationCenter) {
		this.#notifications = notifications
		notifications.addObserver(this.#onHPDidChangeNotification, hpDidChange)
	}

	/** Unity's `OnDisable`. */
	disable(): void {
		this.#notifications.removeObserver(this.#onHPDidChangeNotification, hpDidChange)
	}

	readonly #onHPDidChangeNotification = (stats: Stats): void => {
		if (stats.get(StatTypes.HP) === 0) {
			const status = stats.unit!.status
			const c = status.add(KnockOutStatusEffect, StatComparisonCondition)
			c.init(StatTypes.HP, 0, c.equalTo)
		}
	}
}
