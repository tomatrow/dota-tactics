import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { destroy } from "#lib/common/unity/Object.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import type { StatusCondition, StatusConditionType } from "./conditions/StatusCondition.ts"
import type { StatusEffect, StatusEffectType } from "./effects/StatusEffect.ts"

declare module "#lib/common/notification-center/NotificationCenter.ts" {
	interface Notifications {
		"Status.AddedNotification": [sender: Status, effect: StatusEffect]
		"Status.RemovedNotification": [sender: Status, effect: StatusEffect]
	}
}

/** A class to look components up by, abstract or not (Unity's `GetComponent<T>()`'s `T`). */
type ComponentType<T> = abstract new (...args: never[]) => T

/**
 * Port of `View Model Component/Status/Status.cs`: a unit's status effects, each kept on for as
 * long as any of its conditions remains.
 *
 * Unity keeps them in the hierarchy: each effect on a child of the unit, each of its conditions on
 * a child of the effect's. Here the hierarchy is a list per effect, in the order they were added
 * (the order Unity's `GetComponentsInChildren` finds them in). Removing a condition or effect takes
 * it out at once, but, like Unity's `Destroy`, only disables it at the end of the frame.
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
			effect.onEnable()
			this.notifications.postNotification(Status.addedNotification, this, effect)
		}

		const condition = new conditionType(this)
		this.#effects.get(effect)!.push(condition)
		condition.onEnable()
		return condition
	}

	remove(target: StatusCondition): void {
		const effect = this.getEffectOf(target)!
		const conditions = this.#effects.get(effect)!

		conditions.splice(conditions.indexOf(target), 1)
		destroy(target)

		if (conditions.length === 0) {
			this.#effects.delete(effect)
			destroy(effect)
			this.notifications.postNotification(Status.removedNotification, this, effect)
		}
	}

	/** Whether `condition` is on one of the unit's effects (not removed yet). */
	has(condition: StatusCondition): boolean {
		return this.getEffectOf(condition) !== null
	}

	/** The unit's first effect of `type` (Unity: `GetComponentInChildren<T>()`). */
	getEffect<T>(type: ComponentType<T>): T | null {
		for (const effect of this.#effects.keys()) if (effect instanceof type) return effect
		return null
	}

	/** The conditions of `type`, effect by effect (Unity: `GetComponentsInChildren<T>()`). */
	getConditions<T>(type: ComponentType<T>): T[] {
		return [...this.#effects.values()]
			.flat()
			.filter((c): c is T & StatusCondition => c instanceof type)
	}

	/** The effect `condition` keeps on (Unity: `condition.GetComponentInParent<StatusEffect>()`). */
	getEffectOf(condition: StatusCondition): StatusEffect | null {
		for (const [effect, conditions] of this.#effects)
			if (conditions.includes(condition)) return effect
		return null
	}
}
