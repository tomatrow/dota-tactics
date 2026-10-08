import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { clamp, intMaxValue } from "#lib/common/unity/mathf.ts"
import { TurnOrderController } from "#lib/controller/TurnOrderController.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { ClampValueModifier } from "#lib/exceptions/modifiers/ClampValueModifier.ts"
import type { ValueChangeException } from "#lib/exceptions/ValueChangeException.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { Stats } from "./Stats.ts"

const mpWillChange = Stats.willChangeNotification(StatTypes.MP)
const mmpDidChange = Stats.didChangeNotification(StatTypes.MMP)

/**
 * Port of `View Model Component/Actor/Mana.cs`: keeps a unit's MP from going below 0, raises it
 * with its max, and regenerates a tenth of the max (at least 1) as each of its turns begins.
 */
export class Mana {
	readonly #unit: Unit
	readonly #stats: Stats
	readonly #notifications: NotificationCenter

	/** Unity's `Awake` + `OnEnable`. */
	constructor(unit: Unit, notifications: NotificationCenter) {
		this.#unit = unit
		this.#stats = unit.stats
		this.#notifications = notifications
		notifications.addObserver(this.#onMPWillChange, mpWillChange, this.#stats)
		notifications.addObserver(this.#onMMPDidChange, mmpDidChange, this.#stats)
		notifications.addObserver(this.#onTurnBegan, TurnOrderController.turnBeganNotification, unit)
	}

	get mp(): number {
		return this.#stats.get(StatTypes.MP)
	}

	set mp(value: number) {
		this.#stats.set(StatTypes.MP, value)
	}

	get mmp(): number {
		return this.#stats.get(StatTypes.MMP)
	}

	set mmp(value: number) {
		this.#stats.set(StatTypes.MMP, value)
	}

	/** Unity's `OnDisable`. */
	disable(): void {
		const n = this.#notifications
		n.removeObserver(this.#onMPWillChange, mpWillChange, this.#stats)
		n.removeObserver(this.#onMMPDidChange, mmpDidChange, this.#stats)
		n.removeObserver(this.#onTurnBegan, TurnOrderController.turnBeganNotification, this.#unit)
	}

	readonly #onMPWillChange = (_sender: Stats, vce: ValueChangeException): void => {
		// Unity clamps MP to the max *HP* (sic), so regenerating can take MP a little over its max.
		vce.addModifier(new ClampValueModifier(intMaxValue, 0, this.#stats.get(StatTypes.MHP)))
	}

	readonly #onMMPDidChange = (_sender: Stats, oldMMP: number): void => {
		if (this.mmp > oldMMP) this.mp += this.mmp - oldMMP
		else this.mp = clamp(this.mp, 0, this.mmp)
	}

	readonly #onTurnBegan = (): void => {
		if (this.mp < this.mmp) this.mp += Math.max(Math.floor(this.mmp * 0.1), 1)
	}
}
