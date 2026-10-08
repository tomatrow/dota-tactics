import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { clamp } from "#lib/common/unity/mathf.ts"
import type { Random } from "#lib/common/unity/Random.ts"
import type { ValueModifier } from "#lib/exceptions/modifiers/ValueModifier.ts"
import { Info } from "#lib/model/Info.ts"
import type { Ability, AbilityEffect } from "#lib/view-model-component/ability/Ability.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

// Unity's protected consts: the most an effect changes a stat by.
export const minDamage = -999
export const maxDamage = 999

/** A damage formula step's arguments: the attacker, the defender, and modifiers to add to. */
export type DamageStepInfo = Info<Unit, Unit, ValueModifier[]>

declare module "#lib/common/notification-center/NotificationCenter.ts" {
	interface Notifications {
		/** Add modifiers for the attacker's base attack. */
		"BaseAbilityEffect.GetAttackNotification": [sender: BaseAbilityEffect, info: DamageStepInfo]
		/** Add modifiers for the defender's base defense. */
		"BaseAbilityEffect.GetDefenseNotification": [sender: BaseAbilityEffect, info: DamageStepInfo]
		/** Add modifiers for the ability's power. */
		"BaseAbilityEffect.GetPowerNotification": [sender: BaseAbilityEffect, info: DamageStepInfo]
		/** Add modifiers that tweak the damage. */
		"BaseAbilityEffect.TweakDamageNotification": [sender: BaseAbilityEffect, info: DamageStepInfo]
		"BaseAbilityEffect.MissedNotification": [sender: BaseAbilityEffect, args?: undefined]
		/** With the amount the effect changed its target by. */
		"BaseAbilityEffect.HitNotification": [sender: BaseAbilityEffect, amount: number]
	}
}

type DamageStepNotification =
	| "BaseAbilityEffect.GetAttackNotification"
	| "BaseAbilityEffect.GetDefenseNotification"
	| "BaseAbilityEffect.GetPowerNotification"
	| "BaseAbilityEffect.TweakDamageNotification"

/** What an ability effect needs of its battle. */
export interface AbilityEffectContext {
	readonly notifications: NotificationCenter
	readonly random: Random
}

/**
 * Port of `View Model Component/Ability/Effects/BaseAbilityEffect.cs`: what an ability does to a
 * target, if its hit rate lets it.
 *
 * Unity's component sits on one of the ability's child GameObjects, next to that effect's
 * `AbilityEffectTarget` and `HitRate`; `Ability` attaches it there (`attach`). Its unit (Unity's
 * `GetComponentInParent<Unit>()`) is the one it's created for.
 */
export abstract class BaseAbilityEffect {
	static readonly getAttackNotification = "BaseAbilityEffect.GetAttackNotification"
	static readonly getDefenseNotification = "BaseAbilityEffect.GetDefenseNotification"
	static readonly getPowerNotification = "BaseAbilityEffect.GetPowerNotification"
	static readonly tweakDamageNotification = "BaseAbilityEffect.TweakDamageNotification"

	static readonly missedNotification = "BaseAbilityEffect.MissedNotification"
	static readonly hitNotification = "BaseAbilityEffect.HitNotification"

	/** The unit whose ability this is. */
	protected readonly owner: Unit
	protected readonly notifications: NotificationCenter
	protected readonly random: Random
	#ability: Ability | null = null
	#gameObject: AbilityEffect | null = null

	constructor(owner: Unit, { notifications, random }: AbilityEffectContext) {
		this.owner = owner
		this.notifications = notifications
		this.random = random
	}

	/** The ability whose child it is (Unity: `transform.parent`). */
	get ability(): Ability | null {
		return this.#ability
	}

	/** The child GameObject it's on, with its sibling components. */
	protected get gameObject(): AbilityEffect {
		return this.#gameObject!
	}

	/** Puts the effect on its ability's child `gameObject`; Unity then enables it. */
	attach(ability: Ability, gameObject: AbilityEffect): void {
		this.#ability = ability
		this.#gameObject = gameObject
		this.onEnable()
	}

	protected onEnable(): void {}

	abstract predict(target: Tile): number

	apply(target: Tile): void {
		if (!this.gameObject.target.isTarget(target)) return

		if (this.gameObject.hitRate.rollForHit(target))
			this.notifications.postNotification(
				BaseAbilityEffect.hitNotification,
				this,
				this.onApply(target)
			)
		else this.notifications.postNotification(BaseAbilityEffect.missedNotification, this)
	}

	protected abstract onApply(target: Tile): number

	/**
	 * `startValue`, run through the modifiers that observers of `notification` add (ascending
	 * `sortOrder`), floored and clamped to ±999.
	 */
	protected getStat(
		attacker: Unit,
		target: Unit,
		notification: DamageStepNotification,
		startValue: number
	): number {
		const mods: ValueModifier[] = []
		const info = new Info(attacker, target, mods)
		this.notifications.postNotification(notification, this, info)
		// Array.sort is stable: modifiers with equal sort orders apply in the order they were added.
		mods.sort((x, y) => x.sortOrder - y.sortOrder)

		let value = startValue
		for (const mod of mods) value = mod.modify(startValue, value)

		let retValue = Math.floor(value)
		retValue = clamp(retValue, minDamage, maxDamage)
		return retValue
	}
}
