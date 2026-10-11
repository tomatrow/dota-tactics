import { GAUGE_FULL, TICK_RATE } from "./constants.ts"
import type { SimEvent } from "./events.ts"
import type { Unit } from "./unit.ts"
import type { World } from "./world.ts"

/**
 * Where a full gauge's waits are counted: under ¼ s, under 1 s, 3 s, 10 s, then longer. The first
 * is "acted as it filled" (a player's reaction, the AI's 0.2 s think).
 */
export const WAIT_BUCKETS = [0.25, 1, 3, 10] as const

/** One hero's counts since telemetry started, in ticks while it was alive. */
interface Tally {
	alive: number
	/** Stepping between tiles: its gauge pauses (§3). */
	walking: number
	/** Standing with its gauge filling. */
	charging: number
	/** Standing with a full gauge: it could act, and hasn't. */
	ready: number
	/** Charging a spell (§3: it stands until the spell lands). */
	casting: number
	/** With a full gauge, standing or walking. */
	full: number
	/** How many ticks its gauge had been full at each action. */
	waits: number[]
}

/** How a hero spent its time, as shares of the time it was alive. */
export interface Summary {
	/** Minutes alive. */
	readonly minutes: number
	readonly actions: number
	readonly actionsPerMinute: number
	/** The most actions a minute its gauge allows, at its speed, standing. */
	readonly mostPerMinute: number
	readonly walking: number
	readonly charging: number
	readonly ready: number
	readonly casting: number
	readonly full: number
	/** The share of its actions taken as the gauge filled (within the first bucket). */
	readonly prompt: number
	/** The median wait from a full gauge to an action, in seconds. */
	readonly medianWait: number
	/** Actions by how long their gauge had been full: one count per `WAIT_BUCKETS`, then longer. */
	readonly buckets: readonly number[]
}

/**
 * How the heroes spend their time (DESIGN.md §11's two questions, milestone 6): walking, charging,
 * holding a full gauge or casting; how often they act; how long a full gauge waits for them. "If
 * players always act the instant the gauge fills, the cadence is too slow." It reads the world
 * after each step and changes nothing.
 */
export class Telemetry {
	readonly world: World
	/** The tick it started counting. */
	since = 0
	readonly #tallies = new Map<Unit, Tally>()

	constructor(world: World) {
		this.world = world
		this.reset()
	}

	/** Starts counting afresh (after a change to the numbers, say). */
	reset() {
		this.since = this.world.tick
		for (const unit of this.world.heroes) {
			this.#tallies.set(unit, {
				alive: 0,
				walking: 0,
				charging: 0,
				ready: 0,
				casting: 0,
				full: 0,
				waits: []
			})
		}
	}

	/** Counts a step: its events, then each hero's state after it. */
	record(events: readonly SimEvent[]) {
		for (const event of events) {
			if (event.type === "act") this.#tallies.get(event.unit)?.waits.push(event.waited)
		}
		for (const [unit, tally] of this.#tallies) {
			if (!unit.alive) continue
			tally.alive++
			const full = unit.gauge >= GAUGE_FULL
			if (full) tally.full++
			if (unit.casting) tally.casting++
			else if (unit.step) tally.walking++
			else if (full) tally.ready++
			else tally.charging++
		}
	}

	summary(unit: Unit): Summary {
		const tally = this.#tallies.get(unit)
		if (!tally) throw new Error(`${unit.name} isn't a hero`)
		const { alive, waits } = tally
		const share = (ticks: number) => (alive === 0 ? 0 : ticks / alive)
		const minutes = alive / TICK_RATE / 60
		const buckets = WAIT_BUCKETS.map(() => 0).concat(0)
		for (const wait of waits) {
			const i = WAIT_BUCKETS.findIndex((bound) => wait / TICK_RATE < bound)
			buckets[i < 0 ? WAIT_BUCKETS.length : i]++
		}
		const sorted = waits.toSorted((a, b) => a - b)
		const middle = sorted.length / 2
		const median =
			sorted.length === 0 ? 0
			: sorted.length % 2 === 1 ? sorted[Math.floor(middle)]
			: (sorted[middle - 1] + sorted[middle]) / 2
		return {
			minutes,
			actions: waits.length,
			actionsPerMinute: minutes === 0 ? 0 : waits.length / minutes,
			mostPerMinute: (60 * unit.stats.speed) / 100,
			walking: share(tally.walking),
			charging: share(tally.charging),
			ready: share(tally.ready),
			casting: share(tally.casting),
			full: share(tally.full),
			prompt: waits.length === 0 ? 0 : buckets[0] / waits.length,
			medianWait: median / TICK_RATE,
			buckets
		}
	}
}
