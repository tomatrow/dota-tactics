import type { MapModel } from "dota-tactics-grid/map/model.ts"
import type { Team } from "#lib/content/units.ts"
import type { TilePoint } from "./lane-field.ts"
import type { LaneName } from "./unit.ts"
import type { HeroSetup, LaneSetup, Scenario, StructureSetup } from "./world.ts"

export interface ScenarioOptions {
	/** The lanes whose waves run. */
	readonly lanes: readonly LaneName[]
	/** Sentinels of these lanes up to this tier stand; 0 for none. */
	readonly maxTier: 0 | 1 | 2 | 3
	readonly heroes?: readonly HeroSetup[]
	/** The Sentinel each team loses the game with: in this lane, of this tier. */
	readonly objective?: { readonly lane: LaneName; readonly tier: 1 | 2 | 3 }
}

/**
 * The prototype slice (DESIGN.md §11): mid lane, the two T1s, a Warrior for Radiant and a Black
 * Mage for Dire; the first to destroy the other's T1 wins.
 */
export const SLICE: ScenarioOptions = {
	lanes: ["mid"],
	maxTier: 1,
	heroes: [
		{ team: "radiant", job: "warrior" },
		{ team: "dire", job: "blackMage" }
	],
	objective: { lane: "mid", tier: 1 }
}

const TEAMS: readonly Team[] = ["radiant", "dire"]

/**
 * A scenario on the real map: lanes, spawners, Sentinels and Clan Halls (the fountains) from the
 * cartographer's data.
 */
export function mapScenario(model: MapModel, options: ScenarioOptions = SLICE): Scenario {
	const { entities, lanes } = model.data
	const toTile = ([x, y]: readonly number[]): TilePoint => [
		(x - model.originX) / model.cell,
		(y - model.originY) / model.cell
	]

	const laneSetups: LaneSetup[] = []
	for (const name of options.lanes) {
		for (const team of TEAMS) {
			const lane = lanes.find((l) => l.team === team && l.lane === name)
			const spawner = entities.find(
				(e) => e.kind === "lane_spawner" && e.team === team && e.lane === name
			)
			if (!lane || !spawner?.cell) throw new Error(`the map has no ${team} ${name} lane`)
			laneSetups.push({ team, lane: name, path: lane.points.map(toTile), spawner: spawner.cell })
		}
	}

	const structures: StructureSetup[] = []
	for (const e of entities) {
		if (e.kind !== "tower" || !e.cell || !e.lane || !options.lanes.includes(e.lane)) continue
		if (e.team !== "radiant" && e.team !== "dire") continue
		const tier = e.tier
		if (tier !== 1 && tier !== 2 && tier !== 3) continue
		if (tier > options.maxTier) continue
		const objective = options.objective?.lane === e.lane && options.objective.tier === tier
		structures.push({
			team: e.team,
			tier,
			entity: e.name,
			col: e.cell[0],
			row: e.cell[1],
			objective
		})
	}

	const halls: Partial<Record<Team, readonly [number, number]>> = {}
	for (const e of entities) {
		if (e.kind === "fountain" && e.cell && (e.team === "radiant" || e.team === "dire")) {
			halls[e.team] = e.cell
		}
	}

	return {
		terrain: model,
		lanes: laneSetups,
		structures,
		heroes: options.heroes ?? [],
		halls
	}
}
