import { MathUtils } from "three"
import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { ClampValueModifier } from "#lib/exceptions/modifiers/ClampValueModifier.ts"
import type { ValueChangeException } from "#lib/exceptions/ValueChangeException.ts"
import { Stats } from "./Stats.ts"

const hpWillChange = Stats.willChangeNotification(StatTypes.HP)
const mhpDidChange = Stats.didChangeNotification(StatTypes.MHP)

/**
 * Port of `View Model Component/Actor/Health.cs`: keeps a unit's HP between `minHP` and its max
 * HP. When the max goes up, so does HP.
 */
export class Health {
	minHP = 0
	readonly #stats: Stats
	readonly #notifications: NotificationCenter

	/** Unity's `Awake` + `OnEnable`. */
	constructor(stats: Stats, notifications: NotificationCenter) {
		this.#stats = stats
		this.#notifications = notifications
		notifications.addObserver(this.#onHPWillChange, hpWillChange, stats)
		notifications.addObserver(this.#onMHPDidChange, mhpDidChange, stats)
	}

	get hp(): number {
		return this.#stats.get(StatTypes.HP)
	}

	set hp(value: number) {
		this.#stats.set(StatTypes.HP, value)
	}

	get mhp(): number {
		return this.#stats.get(StatTypes.MHP)
	}

	set mhp(value: number) {
		this.#stats.set(StatTypes.MHP, value)
	}

	/** Unity's `OnDisable`. */
	disable(): void {
		this.#notifications.removeObserver(this.#onHPWillChange, hpWillChange, this.#stats)
		this.#notifications.removeObserver(this.#onMHPDidChange, mhpDidChange, this.#stats)
	}

	readonly #onHPWillChange = (_sender: Stats, vce: ValueChangeException): void => {
		vce.addModifier(new ClampValueModifier(Infinity, this.minHP, this.#stats.get(StatTypes.MHP)))
	}

	readonly #onMHPDidChange = (_sender: Stats, oldMHP: number): void => {
		if (this.mhp > oldMHP) this.hp += this.mhp - oldMHP
		else this.hp = MathUtils.clamp(this.hp, this.minHP, this.mhp)
	}
}
