import type { MapEntity, Team } from "./schema.ts"

/** Kinds the viewer has a dedicated model for. Anything else is drawn as a generic marker. */
export const KNOWN_KINDS = [
	"tower",
	"barracks",
	"ancient",
	"fountain",
	"shop",
	"roshan",
	"roshan_pit",
	"tormentor",
	"outpost",
	"rune_power",
	"rune_bounty",
	"neutral_camp",
	"twin_gate",
	"lotus_pool",
	"wisdom_shrine",
	"watcher",
	"filler",
	"building",
	"lane_spawner",
	"neutral_stash"
] as const

/** Minor markers, only drawn with "All markers" on: plumbing rather than places on the map. */
const MINOR_KINDS = new Set(["lane_spawner", "neutral_stash"])

/** Kinds that get a floating label. */
export const LABELLED_KINDS = new Set(["ancient", "fountain", "roshan", "tormentor", "outpost"])

export function isMinor(entity: MapEntity): boolean {
	return MINOR_KINDS.has(entity.kind) || !(KNOWN_KINDS as readonly string[]).includes(entity.kind)
}

const NAMES: Record<string, string> = {
	ancient: "Ancient",
	fountain: "fountain",
	roshan: "Roshan",
	roshan_pit: "Roshan pit",
	tormentor: "Tormentor",
	outpost: "Outpost",
	rune_power: "Power rune spawn",
	rune_bounty: "Bounty rune spawn",
	twin_gate: "Twin gate",
	lotus_pool: "Lotus pool",
	wisdom_shrine: "Wisdom shrine",
	watcher: "Watcher",
	filler: "filler building",
	building: "building",
	neutral_stash: "Neutral item stash",
	ent_dota_halloffame: "Hall of Fame",
	npc_dota_base_blocker: "base blocker"
}

const TEAM_NAMES: Partial<Record<Team, string>> = { radiant: "Radiant", dire: "Dire" }

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** `npc_dota_some_thing` → `some thing`. */
function humanise(kind: string): string {
	return kind.replace(/^(npc_dota_|ent_dota_|dota_)/, "").replaceAll("_", " ")
}

/** A readable name, e.g. "Radiant tier 1 top tower" or "Large neutral camp". */
export function entityTitle(e: MapEntity): string {
	const team = TEAM_NAMES[e.team]
	let name: string
	switch (e.kind) {
		case "tower":
			name = ["tier", e.tier ?? "?", e.lane, "tower"].filter((part) => part !== undefined).join(" ")
			break
		case "barracks":
			name = [e.lane, e.type, "barracks"].filter(Boolean).join(" ")
			break
		case "shop":
			name = `${e.shop ?? ""} shop`.trim()
			break
		case "neutral_camp":
			name = `${e.size ?? ""} neutral camp`.trim()
			break
		case "lane_spawner":
			name = `${e.lane ?? ""} lane creep spawner`.trim()
			break
		default:
			name = NAMES[e.kind] ?? humanise(e.kind)
	}
	return capitalise(team ? `${team} ${name}` : name)
}

/** The short label drawn above the map for `LABELLED_KINDS`. */
export function entityLabel(e: MapEntity): string {
	if (e.kind === "outpost") return "Outpost"
	if (e.kind === "roshan") return "Roshan"
	return entityTitle(e)
}

/** Kind-specific extras as `[label, value]` pairs, for the info panel. */
export function entityExtras(e: MapEntity): [string, string][] {
	const extras: [string, string][] = []
	if (e.tier !== undefined) extras.push(["Tier", String(e.tier)])
	if (e.lane) extras.push(["Lane", e.lane])
	if (e.type) extras.push(["Type", e.type])
	if (e.size) extras.push(["Camp", e.size])
	if (e.shop) extras.push(["Shop", e.shop])
	return extras
}
