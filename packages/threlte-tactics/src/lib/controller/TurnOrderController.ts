import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { BaseException } from "#lib/exceptions/BaseException.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

declare module "#lib/common/notification-center/NotificationCenter.ts" {
	interface Notifications {
		"TurnOrderController.roundBegan": [sender: TurnOrderController, args?: undefined]
		/** Whether a unit may take a turn; listeners may flip the exception. */
		"TurnOrderController.turnCheck": [sender: Unit, exc: BaseException]
		"TurnOrderController.TurnBeganNotification": [sender: Unit, args?: undefined]
		"TurnOrderController.turnCompleted": [sender: Unit, args?: undefined]
		"TurnOrderController.roundEnded": [sender: TurnOrderController, args?: undefined]
	}
}

const turnActivation = 1000
const turnCost = 500
const moveCost = 300
const actionCost = 200

/** What the turn order uses of its `BattleController` (Unity's `GetComponent<BattleController>()`). */
export type TurnOrderOwner = Pick<BattleController, "notifications" | "turn" | "units">

/**
 * Port of `Controller/TurnOrderController.cs`: decides who acts when. Each round every unit's
 * counter (CTR) grows by its speed; then, highest counter first, each unit at or over 1000 takes a
 * turn, which costs 500, plus 300 if it moved and 200 if it acted.
 */
export class TurnOrderController {
	static readonly roundBeganNotification = "TurnOrderController.roundBegan"
	static readonly turnCheckNotification = "TurnOrderController.turnCheck"
	static readonly turnBeganNotification = "TurnOrderController.TurnBeganNotification"
	static readonly turnCompletedNotification = "TurnOrderController.turnCompleted"
	static readonly roundEndedNotification = "TurnOrderController.roundEnded"

	readonly #bc: TurnOrderOwner

	constructor(owner: TurnOrderOwner) {
		this.#bc = owner
	}

	/**
	 * The rounds, forever: yields each unit as its turn begins (after making it the `turn`'s
	 * actor), and charges for the turn when resumed.
	 */
	*round(): Generator<Unit, never, unknown> {
		const bc = this.#bc
		const { notifications } = bc
		for (;;) {
			notifications.postNotification(TurnOrderController.roundBeganNotification, this)

			const units = [...bc.units]
			for (const unit of units) {
				const s = unit.stats
				s.set(StatTypes.CTR, s.get(StatTypes.CTR) + s.get(StatTypes.SPD))
			}

			// Stable, unlike .NET's sort: units with equal counters keep their order.
			units.sort((a, b) => this.#getCounter(a) - this.#getCounter(b))

			for (let i = units.length - 1; i >= 0; --i) {
				const unit = units[i]!
				if (this.#canTakeTurn(unit)) {
					bc.turn.change(unit)
					notifications.postNotification(TurnOrderController.turnBeganNotification, unit)

					yield unit

					let cost = turnCost
					if (bc.turn.hasUnitMoved) cost += moveCost
					if (bc.turn.hasUnitActed) cost += actionCost

					const s = unit.stats
					s.setValue(StatTypes.CTR, s.get(StatTypes.CTR) - cost, false)

					notifications.postNotification(TurnOrderController.turnCompletedNotification, unit)
				}
			}

			notifications.postNotification(TurnOrderController.roundEndedNotification, this)
		}
	}

	#canTakeTurn(target: Unit): boolean {
		const exc = new BaseException(this.#getCounter(target) >= turnActivation)
		this.#bc.notifications.postNotification(TurnOrderController.turnCheckNotification, target, exc)
		return exc.toggle
	}

	#getCounter(target: Unit): number {
		return target.stats.get(StatTypes.CTR)
	}
}
