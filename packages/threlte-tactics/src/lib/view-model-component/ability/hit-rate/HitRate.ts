import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import type { Random } from "#lib/common/unity/Random.ts"
import { MatchException } from "#lib/exceptions/MatchException.ts"
import { Info } from "#lib/model/Info.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

declare module "#lib/common/notification-center/NotificationCenter.ts" {
	interface Notifications {
		/** Whether the attack can't miss: flip the exception (off by default) to make it so. */
		"HitRate.AutomaticHitCheckNotification": [sender: HitRate, exc: MatchException]
		/** Whether the attack can't hit: flip the exception (off by default) to make it so. */
		"HitRate.AutomaticMissCheckNotification": [sender: HitRate, exc: MatchException]
		/**
		 * The attacker, the defender, and the defender's evade or resistance (`arg2`), which status
		 * effects may change.
		 */
		"HitRate.StatusCheckNotification": [sender: HitRate, info: Info<Unit, Unit, number>]
	}
}

/** What a hit rate needs of its battle. */
export interface HitRateContext {
	readonly notifications: NotificationCenter
	readonly random: Random
}

/**
 * Port of `View Model Component/Ability/Hit Rate/HitRate.cs`: an ability effect's chance (0–100)
 * of succeeding on a target. Subclasses run the shared checks in their own order.
 */
export abstract class HitRate {
	static readonly automaticHitCheckNotification = "HitRate.AutomaticHitCheckNotification"
	static readonly automaticMissCheckNotification = "HitRate.AutomaticMissCheckNotification"
	static readonly statusCheckNotification = "HitRate.StatusCheckNotification"

	/** Whether the angle of attack matters (for the A.I.). */
	get isAngleBased(): boolean {
		return true
	}

	/** The unit whose ability this is (Unity: `GetComponentInParent<Unit>()`). */
	protected readonly attacker: Unit
	readonly #notifications: NotificationCenter
	readonly #random: Random

	constructor(attacker: Unit, { notifications, random }: HitRateContext) {
		this.attacker = attacker
		this.#notifications = notifications
		this.#random = random
	}

	/** A value in the range of 0 to 100 as a percent chance of an ability succeeding to hit. */
	abstract calculate(target: Tile): number

	rollForHit(target: Tile): boolean {
		const roll = this.#random.rangeInt(0, 101)
		const chance = this.calculate(target)
		return roll <= chance
	}

	protected automaticHit(target: Unit): boolean {
		const exc = new MatchException(this.attacker, target)
		this.#notifications.postNotification(HitRate.automaticHitCheckNotification, this, exc)
		return exc.toggle
	}

	protected automaticMiss(target: Unit): boolean {
		const exc = new MatchException(this.attacker, target)
		this.#notifications.postNotification(HitRate.automaticMissCheckNotification, this, exc)
		return exc.toggle
	}

	protected adjustForStatusEffects(target: Unit, rate: number): number {
		const args = new Info(this.attacker, target, rate)
		this.#notifications.postNotification(HitRate.statusCheckNotification, this, args)
		return args.arg2
	}

	protected final(evade: number): number {
		return 100 - evade
	}
}
