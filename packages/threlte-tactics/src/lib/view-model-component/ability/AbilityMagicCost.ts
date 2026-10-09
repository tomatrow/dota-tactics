import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { BaseException } from "#lib/exceptions/BaseException.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { Ability, type AbilityContext } from "./Ability.ts"

/**
 * Port of `View Model Component/Ability/AbilityMagicCost.cs`: an ability needs `amount` MP to be
 * performed, and performing it spends them.
 *
 * Its unit is the one it's created for; `Ability` attaches it to its ability, which enables it.
 */
export class AbilityMagicCost {
	amount: number
	readonly #unit: Unit
	readonly #notifications: NotificationCenter
	#owner: Ability | null = null

	constructor(unit: Unit, { notifications }: AbilityContext, { amount = 0 } = {}) {
		this.#unit = unit
		this.#notifications = notifications
		this.amount = amount
	}

	/** Puts the cost on its ability, then enables it. */
	attach(owner: Ability): void {
		this.#owner = owner
		this.enable()
	}

	enable(): void {
		const n = this.#notifications
		n.addObserver(this.#onCanPerformCheck, Ability.canPerformCheck, this.#owner)
		n.addObserver(this.#onDidPerformNotification, Ability.didPerformNotification, this.#owner)
	}

	disable(): void {
		const n = this.#notifications
		n.removeObserver(this.#onCanPerformCheck, Ability.canPerformCheck, this.#owner)
		n.removeObserver(this.#onDidPerformNotification, Ability.didPerformNotification, this.#owner)
	}

	readonly #onCanPerformCheck = (_sender: Ability, exc: BaseException): void => {
		const s = this.#unit.stats
		if (s.get(StatTypes.MP) < this.amount) exc.flipToggle()
	}

	readonly #onDidPerformNotification = (): void => {
		const s = this.#unit.stats
		s.set(StatTypes.MP, s.get(StatTypes.MP) - this.amount)
	}
}
