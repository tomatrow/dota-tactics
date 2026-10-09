import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { BaseException } from "#lib/exceptions/BaseException.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { AbilityMagicCost } from "./AbilityMagicCost.ts"
import type { AbilityArea } from "./area-of-effect/AbilityArea.ts"
import type { AbilityEffectTarget } from "./effect-target/AbilityEffectTarget.ts"
import type { BaseAbilityEffect } from "./effects/BaseAbilityEffect.ts"
import type { HitRate } from "./hit-rate/HitRate.ts"
import type { BaseAbilityPower } from "./power/BaseAbilityPower.ts"
import type { AbilityRange } from "./range/AbilityRange.ts"

declare module "#lib/common/notification-center/NotificationCenter.ts" {
	interface Notifications {
		/** Whether the ability can be performed: flip the exception (on by default) to prevent it. */
		"Ability.CanPerformCheck": [sender: Ability, exc: BaseException]
		"Ability.FailedNotification": [sender: Ability, args?: undefined]
		"Ability.DidPerformNotification": [sender: Ability, args?: undefined]
	}
}

/**
 * One of an ability's child GameObjects: an effect of the ability, whom it applies to, and its
 * chance to.
 */
export interface AbilityEffect {
	/** The GameObject's name. */
	readonly name: string
	readonly hitRate: HitRate
	readonly target: AbilityEffectTarget
	readonly effect: BaseAbilityEffect
}

/** What an ability needs of its battle. */
export interface AbilityContext {
	readonly notifications: NotificationCenter
}

/**
 * Port of `View Model Component/Ability/Ability.cs`, and the GameObject it's on: an ability's
 * name, its components (typed fields) and its effects (its child GameObjects),
 * which it performs on targets if nothing prevents it (e.g. too little MP).
 */
export class Ability {
	static readonly canPerformCheck = "Ability.CanPerformCheck"
	static readonly failedNotification = "Ability.FailedNotification"
	static readonly didPerformNotification = "Ability.DidPerformNotification"

	/** The GameObject's name. */
	readonly name: string
	readonly power: BaseAbilityPower | null
	readonly range: AbilityRange
	readonly area: AbilityArea
	readonly magicCost: AbilityMagicCost | null
	/** Its child GameObjects, in order. */
	readonly effects: readonly AbilityEffect[]
	readonly #notifications: NotificationCenter

	constructor(
		{
			name,
			power = null,
			range,
			area,
			magicCost = null,
			effects
		}: {
			name: string
			power?: BaseAbilityPower | null
			range: AbilityRange
			area: AbilityArea
			magicCost?: AbilityMagicCost | null
			effects: readonly AbilityEffect[]
		},
		{ notifications }: AbilityContext
	) {
		this.name = name
		this.power = power
		this.range = range
		this.area = area
		this.magicCost = magicCost
		this.effects = effects
		this.#notifications = notifications

		// The components attach once the ability is complete: they find each other through it.
		power?.attach(this)
		magicCost?.attach(this)
		for (const child of effects) child.effect.attach(this, child)
	}

	canPerform(): boolean {
		const exc = new BaseException(true)
		this.#notifications.postNotification(Ability.canPerformCheck, this, exc)
		return exc.toggle
	}

	perform(targets: readonly Tile[]): void {
		if (!this.canPerform()) {
			this.#notifications.postNotification(Ability.failedNotification, this)
			return
		}

		for (const target of targets) this.#perform(target)

		this.#notifications.postNotification(Ability.didPerformNotification, this)
	}

	/** Whether any of its effects applies to `tile`. */
	isTarget(tile: Tile): boolean {
		for (const child of this.effects) if (child.target.isTarget(tile)) return true
		return false
	}

	#perform(target: Tile): void {
		for (const child of this.effects) child.effect.apply(target)
	}
}
