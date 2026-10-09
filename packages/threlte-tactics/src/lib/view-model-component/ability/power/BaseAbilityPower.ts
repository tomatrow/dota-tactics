import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { AddValueModifier } from "#lib/exceptions/modifiers/AddValueModifier.ts"
import type { Ability } from "#lib/view-model-component/ability/Ability.ts"
import {
	BaseAbilityEffect,
	type DamageStepInfo
} from "#lib/view-model-component/ability/effects/BaseAbilityEffect.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

/** What an ability power needs of its battle. */
export interface AbilityPowerContext {
	readonly notifications: NotificationCenter
}

/**
 * Port of `View Model Component/Ability/Power/BaseAbilityPower.cs`: the base attack, defense and
 * power that its ability's effects calculate with (see `BaseAbilityEffect.getStat`).
 *
 * Its unit is the one it's created for; `Ability` attaches it to its ability, which enables it.
 */
export abstract class BaseAbilityPower {
	protected readonly owner: Unit
	readonly #notifications: NotificationCenter
	#ability: Ability | null = null

	constructor(owner: Unit, { notifications }: AbilityPowerContext) {
		this.owner = owner
		this.#notifications = notifications
	}

	protected abstract getBaseAttack(): number
	protected abstract getBaseDefense(target: Unit): number
	protected abstract getPower(): number

	/** Puts the power on its `ability`, then enables it. */
	attach(ability: Ability): void {
		this.#ability = ability
		this.enable()
	}

	enable(): void {
		const n = this.#notifications
		n.addObserver(this.#onGetBaseAttack, BaseAbilityEffect.getAttackNotification)
		n.addObserver(this.#onGetBaseDefense, BaseAbilityEffect.getDefenseNotification)
		n.addObserver(this.#onGetPower, BaseAbilityEffect.getPowerNotification)
	}

	disable(): void {
		const n = this.#notifications
		n.removeObserver(this.#onGetBaseAttack, BaseAbilityEffect.getAttackNotification)
		n.removeObserver(this.#onGetBaseDefense, BaseAbilityEffect.getDefenseNotification)
		n.removeObserver(this.#onGetPower, BaseAbilityEffect.getPowerNotification)
	}

	readonly #onGetBaseAttack = (sender: BaseAbilityEffect, info: DamageStepInfo): void => {
		if (this.#isMyEffect(sender)) info.arg2.push(new AddValueModifier(0, this.getBaseAttack()))
	}

	readonly #onGetBaseDefense = (sender: BaseAbilityEffect, info: DamageStepInfo): void => {
		if (this.#isMyEffect(sender))
			info.arg2.push(new AddValueModifier(0, this.getBaseDefense(info.arg1)))
	}

	readonly #onGetPower = (sender: BaseAbilityEffect, info: DamageStepInfo): void => {
		if (this.#isMyEffect(sender)) info.arg2.push(new AddValueModifier(0, this.getPower()))
	}

	/** Whether `sender` is one of its ability's effects. */
	#isMyEffect(sender: BaseAbilityEffect): boolean {
		return this.#ability !== null && sender.ability === this.#ability
	}
}
