import { StatTypes } from "#lib/enums/StatTypes.ts"
import {
	BaseAbilityEffect,
	type AbilityEffectContext
} from "#lib/view-model-component/ability/effects/BaseAbilityEffect.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

/**
 * Port of `View Model Component/Ability/Effect Target/AbsorbDamageAbilityEffectTarget.cs`: despite
 * its name and folder, an ability effect. It gives its unit the HP that a sibling effect (the
 * `trackedSiblingIndex`th child of its ability) just took from the same target, or nothing if it
 * missed.
 */
export class AbsorbDamageAbilityEffectTarget extends BaseAbilityEffect {
	trackedSiblingIndex: number
	#effect: BaseAbilityEffect | null = null
	#amount = 0

	constructor(owner: Unit, context: AbilityEffectContext, { trackedSiblingIndex = 0 } = {}) {
		super(owner, context)
		this.trackedSiblingIndex = trackedSiblingIndex
	}

	protected override enable(): void {
		this.#effect = this.#getTrackedEffect()
		// (With no tracked effect, it observes every effect's hits and misses.)
		this.notifications.addObserver(
			this.#onEffectHit,
			BaseAbilityEffect.hitNotification,
			this.#effect
		)
		this.notifications.addObserver(
			this.#onEffectMiss,
			BaseAbilityEffect.missedNotification,
			this.#effect
		)
	}

	predict(_target: Tile): number {
		return 0
	}

	protected onApply(_target: Tile): number {
		const s = this.owner.stats
		s.set(StatTypes.HP, s.get(StatTypes.HP) + this.#amount)
		return this.#amount
	}

	readonly #onEffectHit = (_sender: BaseAbilityEffect, amount: number): void => {
		this.#amount = amount * -1
	}

	readonly #onEffectMiss = (): void => {
		this.#amount = 0
	}

	#getTrackedEffect(): BaseAbilityEffect | null {
		const owner = this.ability!
		if (this.trackedSiblingIndex >= 0 && this.trackedSiblingIndex < owner.effects.length) {
			const sibling = owner.effects[this.trackedSiblingIndex]!
			return sibling.effect
		}
		return null
	}
}
