import type {
	Handler,
	NotificationCenter
} from "#lib/common/notification-center/NotificationCenter.ts"
import { clamp01, intMaxValue } from "#lib/common/unity/mathf.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { ClampValueModifier } from "#lib/exceptions/modifiers/ClampValueModifier.ts"
import { Stats } from "./Stats.ts"

const expWillChange = Stats.willChangeNotification(StatTypes.EXP)
const expDidChange = Stats.didChangeNotification(StatTypes.EXP)

/**
 * Port of `View Model Component/Actor/Rank.cs`: ties a unit's level to its experience, along an
 * ease-in curve. Experience only ever grows.
 */
export class Rank {
	static readonly minLevel = 1
	static readonly maxLevel = 99
	static readonly maxExperience = 999999

	static experienceForLevel(level: number): number {
		// In 32-bit floats, like C#: the result differs by one at a few levels (e.g. the blog's
		// 20,304 experience from level 98 to 99).
		const f = Math.fround
		const levelPercent = f(clamp01(f((level - Rank.minLevel) / (Rank.maxLevel - Rank.minLevel))))
		// EasingEquations.EaseInQuad(0, maxExperience, levelPercent)
		return Math.trunc(f(f(Rank.maxExperience * levelPercent) * levelPercent))
	}

	static levelForExperience(exp: number): number {
		let lvl = Rank.maxLevel
		for (; lvl >= Rank.minLevel; --lvl) if (exp >= Rank.experienceForLevel(lvl)) break
		return lvl
	}

	readonly #stats: Stats
	readonly #notifications: NotificationCenter

	/** Unity's `Awake` + `OnEnable`. */
	constructor(stats: Stats, notifications: NotificationCenter) {
		this.#stats = stats
		this.#notifications = notifications
		notifications.addObserver(this.#onExpWillChange, expWillChange, stats)
		notifications.addObserver(this.#onExpDidChange, expDidChange, stats)
	}

	get lvl(): number {
		return this.#stats.get(StatTypes.LVL)
	}

	get exp(): number {
		return this.#stats.get(StatTypes.EXP)
	}

	set exp(value: number) {
		this.#stats.set(StatTypes.EXP, value)
	}

	get levelPercent(): number {
		return (this.lvl - Rank.minLevel) / (Rank.maxLevel - Rank.minLevel)
	}

	/** Unity's `OnDisable`. */
	disable(): void {
		this.#notifications.removeObserver(this.#onExpWillChange, expWillChange, this.#stats)
		this.#notifications.removeObserver(this.#onExpDidChange, expDidChange, this.#stats)
	}

	init(level: number): void {
		this.#stats.setValue(StatTypes.LVL, level, false)
		this.#stats.setValue(StatTypes.EXP, Rank.experienceForLevel(level), false)
	}

	readonly #onExpWillChange: Handler<typeof expWillChange> = (_sender, vce) => {
		vce.addModifier(new ClampValueModifier(intMaxValue, this.exp, Rank.maxExperience))
	}

	readonly #onExpDidChange: Handler<typeof expDidChange> = () => {
		this.#stats.setValue(StatTypes.LVL, Rank.levelForExperience(this.exp), false)
	}
}
