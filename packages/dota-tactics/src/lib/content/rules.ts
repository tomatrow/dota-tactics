/**
 * A game's numbers (DESIGN.md §5): a copy of the content's for each world, so they can be tuned
 * while it runs (§11, milestone 6) without changing the content or another game. The content
 * stays the defaults: a number worth keeping goes into DESIGN.md, then the content.
 */
import { ABILITIES, type Ability, type AbilityId } from "./abilities.ts"
import { JOBS, type Job, type JobId } from "./heroes.ts"
import { STATUSES, type Status, type StatusId } from "./statuses.ts"
import { TUNING } from "./tuning.ts"
import { CREEPS, SENTINELS, type CreepKind, type UnitStats } from "./units.ts"

/** A content type with its numbers open to change (lists, such as a job's abilities, aren't). */
export type Tunable<T> =
	T extends number ? number
	: T extends string | boolean | readonly unknown[] ? T
	: { -readonly [K in keyof T]: Tunable<T[K]> }

export interface Rules {
	readonly tuning: Tunable<typeof TUNING>
	readonly jobs: Record<JobId, Tunable<Job>>
	readonly abilities: Record<AbilityId, Tunable<Ability>>
	readonly statuses: Record<StatusId, Tunable<Status>>
	readonly creeps: Record<CreepKind, Tunable<UnitStats>>
	readonly sentinels: Record<1 | 2 | 3 | 4, Tunable<UnitStats>>
}

/** A changed number: where it is in the rules ("jobs.warrior.stats.speed"), and its value. */
export type Change = readonly [path: string, value: number]

/** A fresh copy of the content's numbers. */
export function defaultRules(): Rules {
	return structuredClone({
		tuning: TUNING,
		jobs: JOBS,
		abilities: ABILITIES,
		statuses: STATUSES,
		creeps: CREEPS,
		sentinels: SENTINELS
	})
}

/** Every number in the rules by its path, in the content's order. */
export function numbers(rules: Rules): Map<string, number> {
	const found = new Map<string, number>()
	const walk = (value: unknown, path: string) => {
		if (typeof value === "number") found.set(path, value)
		else if (value !== null && typeof value === "object") {
			for (const [key, inner] of Object.entries(value)) walk(inner, path ? `${path}.${key}` : key)
		}
	}
	walk(rules, "")
	return found
}

/** Sets the number at a path; false (and nothing changes) when there's no number there. */
export function setNumber(rules: Rules, path: string, value: number): boolean {
	if (!Number.isFinite(value)) return false
	const keys = path.split(".")
	const last = keys.pop() ?? ""
	let at: unknown = rules
	for (const key of keys) {
		if (at === null || typeof at !== "object" || !Object.hasOwn(at, key)) return false
		at = (at as Record<string, unknown>)[key]
	}
	if (at === null || typeof at !== "object" || !Object.hasOwn(at, last)) return false
	const record = at as Record<string, unknown>
	if (typeof record[last] !== "number") return false
	record[last] = value
	return true
}

/** The numbers that differ from the defaults', in the content's order. */
export function changes(rules: Rules, defaults: Rules): Change[] {
	const now = numbers(rules)
	return [...numbers(defaults)].flatMap(([path, value]): Change[] => {
		const current = now.get(path)
		return current === undefined || current === value ? [] : [[path, current]]
	})
}

/** Changes as text for a URL's `?tune=`: "path:value,path:value". */
export const formatChanges = (list: readonly Change[]): string =>
	list.map(([path, value]) => `${path}:${String(value)}`).join(",")

/** Changes from `?tune=` text; whatever isn't "path:number" is skipped. */
export function parseChanges(text: string): Change[] {
	return text.split(",").flatMap((part): Change[] => {
		const match = /^([\w.]+):(-?\d+(?:\.\d+)?)$/.exec(part.trim())
		return match ? [[match[1], Number(match[2])]] : []
	})
}
