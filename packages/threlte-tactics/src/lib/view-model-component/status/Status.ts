import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { disableLater } from "#lib/common/lifecycle.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import type { StatusCondition, StatusConditionType } from "./conditions/StatusCondition.ts"
import type { StatusEffect, StatusEffectType } from "./effects/StatusEffect.ts"

declare module "#lib/common/notification-center/NotificationCenter.ts" {
	interface Notifications {
		"Status.AddedNotification": [sender: Status, effect: StatusEffect]
		"Status.RemovedNotification": [sender: Status, effect: StatusEffect]
	}
}

/** A class to look effects and conditions up by, abstract or not. */
type ComponentType<T> = abstract new (...args: never[]) => T

/**
 * Port of `View Model Component/Status/Status.cs`: a unit's status effects, each kept on for as
 * long as any of its conditions remains. Effects and their conditions are kept in the order they
 * were added. Removing a condition or effect takes it out at once, but only disables it once the
 * code running now has finished (`disableLater`).
 */
export class Status {
	static readonly addedNotification = "Status.AddedNotification"
	static readonly removedNotification = "Status.RemovedNotification"

	/** The unit the status is on. */
	readonly owner: Unit
	readonly notifications: NotificationCenter
	readonly #effects = new Map<StatusEffect, StatusCondition[]>()

	constructor(owner: Unit, notifications: NotificationCenter) {
		this.owner = owner
		this.notifications = notifications
	}

	/** Adds a `U` condition to the unit's `T` effect, adding the effect if the unit lacks it. */
	add<T extends StatusEffect, U extends StatusCondition>(
		effectType: StatusEffectType<T>,
		conditionType: StatusConditionType<U>
	): U {
		let effect = this.getEffect(effectType)

		if (effect === null) {
			effect = new effectType(this)
			this.#effects.set(effect, [])
			effect.enable()
			this.notifications.postNotification(Status.addedNotification, this, effect)
		}

		const condition = new conditionType(this)
		this.#effects.get(effect)!.push(condition)
		condition.enable()
		return condition
	}

	remove(target: StatusCondition): void {
		const effect = this.getEffectOf(target)!
		const conditions = this.#effects.get(effect)!

		conditions.splice(conditions.indexOf(target), 1)
		disableLater(target)

		if (conditions.length === 0) {
			this.#effects.delete(effect)
			disableLater(effect)
			this.notifications.postNotification(Status.removedNotification, this, effect)
		}
	}

	/** Whether `condition` is on one of the unit's effects (not removed yet). */
	has(condition: StatusCondition): boolean {
		return this.getEffectOf(condition) !== null
	}

	/** The unit's first effect of `type`. */
	getEffect<T>(type: ComponentType<T>): T | null {
		for (const effect of this.#effects.keys()) if (effect instanceof type) return effect
		return null
	}

	/** The conditions of `type`, effect by effect. */
	getConditions<T>(type: ComponentType<T>): T[] {
		return [...this.#effects.values()]
			.flat()
			.filter((c): c is T & StatusCondition => c instanceof type)
	}

	/** The effect `condition` keeps on. */
	getEffectOf(condition: StatusCondition): StatusEffect | null {
		for (const [effect, conditions] of this.#effects)
			if (conditions.includes(condition)) return effect
		return null
	}
}
