import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Stats } from "#lib/view-model-component/actor/Stats.ts"
import type { Status } from "#lib/view-model-component/status/Status.ts"
import { StatusCondition } from "./StatusCondition.ts"

/**
 * Port of `View Model Component/Status/Conditions/StatComparisonCondition.cs`: lasts while
 * `condition` holds, checked whenever the stat `type` changes. `equalTo`, `lessThan`… compare the
 * stat with `value`.
 */
export class StatComparisonCondition extends StatusCondition {
	#type: StatTypes = StatTypes.LVL
	#value = 0
	#condition: (() => boolean) | null = null
	readonly #stats: Stats

	/** Unity's `Awake`. */
	constructor(status: Status) {
		super(status)
		this.#stats = status.owner.stats
	}

	get type(): StatTypes {
		return this.#type
	}

	get value(): number {
		return this.#value
	}

	get condition(): (() => boolean) | null {
		return this.#condition
	}

	override onDisable(): void {
		this.status.notifications.removeObserver(
			this.#onStatChanged,
			Stats.didChangeNotification(this.#type),
			this.#stats
		)
	}

	init(type: StatTypes, value: number, condition: (() => boolean) | null): void {
		this.#type = type
		this.#value = value
		this.#condition = condition
		this.status.notifications.addObserver(
			this.#onStatChanged,
			Stats.didChangeNotification(type),
			this.#stats
		)
	}

	// Arrow functions, so they can be passed as `condition` (C#'s method groups).
	readonly equalTo = (): boolean => this.#stats.get(this.#type) === this.#value
	readonly lessThan = (): boolean => this.#stats.get(this.#type) < this.#value
	readonly lessThanOrEqualTo = (): boolean => this.#stats.get(this.#type) <= this.#value
	readonly greaterThan = (): boolean => this.#stats.get(this.#type) > this.#value
	readonly greaterThanOrEqualTo = (): boolean => this.#stats.get(this.#type) >= this.#value

	readonly #onStatChanged = (): void => {
		if (this.#condition !== null && !this.#condition()) this.remove()
	}
}
