import { describe, expect, test } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/unity/Random.ts"
import { Resources } from "#lib/common/unity/Resources.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { Job, type JobPrefab } from "./Job.ts"
import type { Stats } from "./Stats.ts"

/** A `Random` whose `value` is always `value`. */
class FixedRandom extends Random {
	readonly #value: number
	constructor(value: number) {
		super(0)
		this.#value = value
	}
	override get value(): number {
		return this.#value
	}
}

function hire(name: string, random: Random = new Random(1)) {
	const notifications = new NotificationCenter()
	const unit = new Unit({ name: "Hero", model: "Hero", notifications })
	unit.stats.set(StatTypes.LVL, 1)
	const job = new Job(Resources.load<JobPrefab>(`Jobs/${name}`)!, { notifications, random })
	job.employ(unit)
	job.loadDefaultStats()
	return { stats: unit.stats, job, rank: unit.rank }
}

const stat = (stats: Stats, ...types: StatTypes[]) => types.map((t) => stats.get(t))
const { LVL, HP, MHP, MP, MMP, ATK, DEF, MAT, MDF, SPD, EVD, RES, MOV, JMP } = StatTypes

describe("Job", () => {
	test("the generated jobs hold Settings/*.csv", () => {
		expect(Resources.paths("Jobs")).toEqual(["Jobs/Rogue", "Jobs/Warrior", "Jobs/Wizard"])
		expect(Resources.load<JobPrefab>("Jobs/Warrior")).toEqual({
			name: "Warrior",
			baseStats: [43, 5, 61, 89, 11, 58, 100],
			growStats: [8.4, 0.8, 8.8, 9.2, 1.1, 7.6, 1.1],
			features: [
				{ type: EVD, amount: 50 },
				{ type: RES, amount: 50 },
				{ type: MOV, amount: 4 },
				{ type: JMP, amount: 1 }
			]
		})
	})

	test("loads the starting stats, with full HP and MP, and grants its features", () => {
		const { stats } = hire("Rogue")
		expect(stat(stats, LVL, MHP, MMP, ATK, DEF, MAT, MDF, SPD)).toEqual([
			1, 32, 13, 51, 67, 51, 67, 110
		])
		expect(stat(stats, HP, MP)).toEqual([32, 13])
		expect(stat(stats, EVD, RES, MOV, JMP)).toEqual([50, 50, 5, 3])
	})

	test("grows the stats by their whole part every level, with a chance of one more point", () => {
		const never = hire("Warrior", new FixedRandom(0))
		never.rank.init(3)
		expect(stat(never.stats, MHP, MMP, ATK, DEF, MAT, MDF, SPD)).toEqual([
			43 + 16,
			5,
			61 + 16,
			89 + 18,
			11 + 2,
			58 + 14,
			100 + 2
		])
		expect(stat(never.stats, HP, MP)).toEqual([59, 5])

		const always = hire("Warrior", new FixedRandom(0.999))
		always.rank.init(3)
		expect(stat(always.stats, MHP, MMP, ATK, DEF, MAT, MDF, SPD)).toEqual([
			43 + 18,
			5 + 2,
			61 + 18,
			89 + 20,
			11 + 4,
			58 + 16,
			100 + 4
		])
	})

	test("the bonus point comes with the fraction's chance", () => {
		const { stats, rank } = hire("Rogue", new Random(123))
		rank.init(99)
		// MHP grows 7 or 8 points per level, 8 with a 60% chance.
		const bonus = stats.get(MHP) - 32 - 98 * 7
		expect(bonus / 98).toBeGreaterThan(0.45)
		expect(bonus / 98).toBeLessThan(0.75)
	})

	test("un-employing removes the features and stops growth", () => {
		const { stats, job, rank } = hire("Wizard")
		job.unEmploy()
		expect(stat(stats, EVD, RES, MOV, JMP)).toEqual([0, 0, 0, 0])
		rank.init(20)
		expect(stats.get(MHP)).toBe(30)
	})
})
