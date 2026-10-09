import type {
	Handler,
	NotificationCenter
} from "#lib/common/notification-center/NotificationCenter.ts"
import type { Random } from "#lib/common/Random.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { Feature, FeatureTarget } from "#lib/view-model-component/features/Feature.ts"
import { StatModifierFeature } from "#lib/view-model-component/features/StatModifierFeature.ts"
import { Stats } from "./Stats.ts"

const lvlDidChange = Stats.didChangeNotification(StatTypes.LVL)

/**
 * A `Resources/Jobs/<name>.prefab`, which Unity's `JobParser` makes from `Settings/*.csv`: a `Job`
 * plus the `StatModifierFeature`s it grants (EVD, RES, MOV, JMP). Generated into
 * `src/lib/resources/Jobs/` by `pnpm convert`.
 */
export interface JobPrefab {
	name: string
	/** Starting stats, in `Job.statOrder`. */
	baseStats: number[]
	/** Per-level growth, in `Job.statOrder`: whole points plus the chance of one more. */
	growStats: number[]
	features: { type: StatTypes; amount: number }[]
}

/**
 * Port of `View Model Component/Actor/Job.cs`: a unit's starting stats, how they grow on level
 * up, and the features it grants while employed.
 */
export class Job {
	static readonly statOrder = [
		StatTypes.MHP,
		StatTypes.MMP,
		StatTypes.ATK,
		StatTypes.DEF,
		StatTypes.MAT,
		StatTypes.MDF,
		StatTypes.SPD
	] as const

	/** The GameObject's name. */
	readonly name: string
	baseStats: number[]
	growStats: number[]
	/** The job's features (Unity's `GetComponentsInChildren<Feature>()`). */
	readonly features: readonly Feature[]
	#stats: Stats | null = null
	readonly #notifications: NotificationCenter
	readonly #random: Random

	/** Unity's `Instantiate(jobPrefab)`. */
	constructor(
		prefab: JobPrefab,
		{ notifications, random }: { notifications: NotificationCenter; random: Random }
	) {
		this.name = prefab.name
		this.baseStats = [...prefab.baseStats]
		this.growStats = [...prefab.growStats]
		this.features = prefab.features.map((f) => new StatModifierFeature(f.type, f.amount))
		this.#notifications = notifications
		this.#random = random
	}

	/** Unity's `OnDestroy`. */
	destroy(): void {
		this.#notifications.removeObserver(this.onLvlChangeNotification, lvlDidChange, this.#stats)
	}

	/** Starts working for `owner` (Unity: the unit the job is parented to). */
	employ(owner: FeatureTarget): void {
		this.#stats = owner.stats
		this.#notifications.addObserver(this.onLvlChangeNotification, lvlDidChange, this.#stats)

		for (const feature of this.features) feature.activate(owner)
	}

	unEmploy(): void {
		for (const feature of this.features) feature.deactivate()

		this.#notifications.removeObserver(this.onLvlChangeNotification, lvlDidChange, this.#stats)
		this.#stats = null
	}

	loadDefaultStats(): void {
		const stats = this.#stats!
		for (let i = 0; i < Job.statOrder.length; ++i) {
			const type = Job.statOrder[i]!
			stats.setValue(type, this.baseStats[i]!, false)
		}

		stats.setValue(StatTypes.HP, stats.get(StatTypes.MHP), false)
		stats.setValue(StatTypes.MP, stats.get(StatTypes.MMP), false)
	}

	protected readonly onLvlChangeNotification: Handler<typeof lvlDidChange> = (
		_sender,
		oldValue
	) => {
		const newValue = this.#stats!.get(StatTypes.LVL)

		for (let i = oldValue; i < newValue; ++i) this.#levelUp()
	}

	#levelUp(): void {
		const stats = this.#stats!
		for (let i = 0; i < Job.statOrder.length; ++i) {
			const type = Job.statOrder[i]!
			const whole = Math.floor(this.growStats[i]!)
			const fraction = this.growStats[i]! - whole

			let value = stats.get(type)
			value += whole
			if (this.#random.value() > 1 - fraction) value++

			stats.setValue(type, value, false)
		}

		stats.setValue(StatTypes.HP, stats.get(StatTypes.MHP), false)
		stats.setValue(StatTypes.MP, stats.get(StatTypes.MMP), false)
	}
}
