import { GAUGE_FULL } from "#lib/sim/constants.ts"
import type { SimEvent } from "#lib/sim/events.ts"
import type { Terrain } from "#lib/sim/grid.ts"
import { World, type LaneSetup, type Scenario } from "#lib/sim/world.ts"

/** Both teams' lanes along the middle row, Radiant going east. */
export function lanes(board: Terrain): LaneSetup[] {
	const row = Math.floor(board.rows / 2)
	const west = [0.5, row + 0.5] as const
	const east = [board.cols - 0.5, row + 0.5] as const
	return [
		{ team: "radiant", lane: "mid", path: [west, east], spawner: [1, row] },
		{ team: "dire", lane: "mid", path: [east, west], spawner: [board.cols - 2, row] }
	]
}

/** A lane for one team that ends on a tile, so its creeps placed there wait. */
export const waitingLane = (team: LaneSetup["team"], col: number, row: number): LaneSetup => ({
	team,
	lane: "mid",
	path: [[col + 0.5, row + 0.5]],
	spawner: [col, row]
})

/** A world on a test board: both lanes, no structures, no waves, unless `options` say otherwise. */
export function testWorld(board: Terrain, options: Partial<Scenario> = {}, seed = 1): World {
	return new World(
		{ terrain: board, lanes: lanes(board), structures: [], waves: false, ...options },
		seed
	)
}

export interface Logged {
	readonly tick: number
	readonly event: SimEvent
}

/** Runs `count` ticks, returning every event with the tick it happened in. */
export function run(w: World, count: number): Logged[] {
	const log: Logged[] = []
	for (let i = 0; i < count; i++) {
		const tick = w.tick
		for (const event of w.step()) log.push({ tick, event })
	}
	return log
}

export const attacks = (log: readonly Logged[]) =>
	log.flatMap(({ tick, event }) => (event.type === "attack" ? [{ tick, ...event }] : []))

/** The tick a unit of this speed, charging from empty on tick `from`, first has a full gauge. */
export const fullAt = (speed: number, from = 0) => from + Math.ceil(GAUGE_FULL / speed) - 1

/** The ticks of a standing unit's first `count` attacks: it empties its gauge each time. */
export function cadence(speed: number, count: number): number[] {
	const out = [fullAt(speed)]
	while (out.length < count) out.push(fullAt(speed, (out.at(-1) ?? 0) + 1))
	return out
}

/** A short text trace of a run, for comparing runs. */
export const trace = (log: readonly Logged[]) =>
	log
		.map(({ tick, event }) =>
			event.type === "attack" ?
				`${String(tick)}:${String(event.attacker.id)}>${String(event.target.id)}:${String(event.damage)}`
			:	`${String(tick)}:${event.type}:${String(event.unit.id)}`
		)
		.join("|")
