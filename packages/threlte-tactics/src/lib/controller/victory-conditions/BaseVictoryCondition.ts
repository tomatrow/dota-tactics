import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Alliances } from "#lib/enums/Alliances.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Stats } from "#lib/view-model-component/actor/Stats.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

const hpDidChange = Stats.didChangeNotification(StatTypes.HP)

/** What a victory condition needs of its battle. */
export interface VictoryConditionOwner {
	readonly notifications: NotificationCenter
	readonly units: readonly Unit[]
}

/**
 * Port of `Controller/Victory Conditions/BaseVictoryCondition.cs`: decides who won, checking
 * whenever any unit's HP change. The heroes lose once they're all defeated; subclasses decide
 * how they win.
 */
export abstract class BaseVictoryCondition {
	#victor: Alliances = Alliances.None
	protected readonly bc: VictoryConditionOwner

	constructor(bc: VictoryConditionOwner) {
		this.bc = bc
		bc.notifications.addObserver(this.#onHPDidChangeNotification, hpDidChange)
	}

	/** `None` until the battle is decided. */
	get victor(): Alliances {
		return this.#victor
	}

	protected set victor(value: Alliances) {
		this.#victor = value
	}

	/** Stops observing HP changes. */
	disable(): void {
		this.bc.notifications.removeObserver(this.#onHPDidChangeNotification, hpDidChange)
	}

	readonly #onHPDidChangeNotification = (): void => {
		this.onHPDidChangeNotification()
	}

	protected onHPDidChangeNotification(): void {
		this.checkForGameOver()
	}

	protected checkForGameOver(): void {
		if (this.partyDefeated(Alliances.Hero)) this.victor = Alliances.Enemy
	}

	protected partyDefeated(type: Alliances): boolean {
		for (const unit of this.bc.units) {
			const a = unit.alliance
			if (a === null) continue

			if (a.type === type && !this.isDefeated(unit)) return false
		}
		return true
	}

	protected isDefeated(unit: Unit): boolean {
		const health = unit.health
		if (health !== null) return health.minHP === health.hp

		const stats = unit.stats
		return stats.get(StatTypes.HP) === 0
	}
}
