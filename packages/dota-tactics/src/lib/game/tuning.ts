/**
 * What the tuning window lists (DESIGN.md §11, milestone 6): the game's numbers, grouped as the
 * design groups them, with names. Numbers that can't change in a running game (footprints, the
 * lanes' corridor) and ones nothing uses (a creep's MP) are left out; `?tune=` still takes them.
 */
import { numbers } from "#lib/content/rules.ts"
import { CREEP_NAMES, type CreepKind } from "#lib/content/units.ts"
import type { World } from "#lib/sim/world.ts"

/** One number: where it is in the rules, its name, and what it means. */
export interface Knob {
	readonly path: string
	readonly label: string
	readonly hint: string
}

/** Knobs under a heading (a unit, an ability), or under none. */
export interface KnobGroup {
	readonly title: string | null
	readonly knobs: readonly Knob[]
}

export interface Section {
	readonly title: string
	readonly groups: readonly KnobGroup[]
}

type Names = Readonly<Record<string, readonly [label: string, hint: string]>>

const RULES: Names = {
	waveInterval: ["Wave every", "seconds between waves (applies from the next)"],
	siegeEvery: ["Siege every", "waves: every this many brings a siege creep"],
	walkCharge: ["Walk charge %", "percent of its speed a walking unit charges (§3)"],
	baseHit: ["Hit %", "hit chance before evasion (§12)"],
	uphillMiss: ["Uphill miss %", "hit chance lost against higher ground"],
	minDamage: ["Damage floor %", "damage never falls below this percent of ATK"],
	mpPerAction: ["MP per action", "MP every action gives (§3)"],
	respawnBase: ["Respawn", "seconds, plus the next per level"],
	respawnPerLevel: ["Respawn / level", "seconds per hero level"],
	denyBelow: ["Deny under %", "a hero may deny its creep under this percent of its HP"],
	heroBounty: ["Hero bounty", "gold for a hero kill, plus the next per level"],
	heroBountyPerLevel: ["Bounty / level", "gold per level of the hero killed"],
	aggroTime: ["Aggro time", "seconds creeps chase a hero who attacked theirs"],
	hallRadius: ["Clan Hall reach", "tiles round the Clan Hall where heroes heal"],
	hallRegen: ["Clan Hall regen %", "percent of HP a second there"]
}

const STATS: Names = {
	hp: ["HP", "most HP"],
	mp: ["MP", "most MP"],
	atk: ["ATK", "weapon attack"],
	matk: ["MATK", "magic attack: a spell does power × MATK/50"],
	def: ["DEF", "a blow does DEF/2 less"],
	res: ["RES", "a spell does RES/2 less"],
	evasion: ["Evasion %", "from the front; half from the side, none from behind"],
	speed: ["Speed", "gauge points a second: an action every 100/speed seconds"],
	reach: ["Reach", "attack reach in tiles"],
	walk: ["Walk", "game units a second (64 a tile)"],
	aggro: ["Aggro", "tiles it notices enemies within"],
	vsStructures: ["× structures", "damage multiplier against structures"],
	vsCreeps: ["× creeps", "damage multiplier against creeps"],
	bounty: ["Bounty", "gold for its last hit"]
}

const ABILITY: Names = {
	mp: ["MP", "MP it costs"],
	reach: ["Reach", "tiles to its target"],
	area: ["Area", "tiles round the aimed tile it hits"],
	charge: ["Charge", "seconds from the cast to the effect"],
	"effect.percent": ["Heal %", "percent of HP it heals"],
	"effect.power": ["Power", "ATK × power for a blow; power × MATK/50 for a spell"],
	"effect.recoil": ["Recoil %", "percent of the damage the user takes"],
	"effect.inflicts.seconds": ["Status time", "seconds its status lasts"]
}

const STATUS: Names = {
	speed: ["Speed ±", "added to speed while it lasts"],
	walk: ["Walk %", "percent of walk speed kept while it lasts"]
}

/** Numbers each kind of unit doesn't use, or that can't change in a running game. */
const UNUSED = {
	hero: new Set(["radius", "bounty"]),
	creep: new Set(["radius", "mp", "matk"]),
	sentinel: new Set(["radius", "mp", "matk", "res", "walk", "evasion"])
}

const CREEP_TITLES: Record<CreepKind, string> = {
	melee: "Melee creep",
	ranged: "Ranged creep",
	siege: "Siege creep"
}

/**
 * The knobs under a path in the rules, named from `names` (by the rest of their path) and in its
 * order; any it doesn't name come last.
 */
function knobs(all: Map<string, number>, prefix: string, names: Names, skip = new Set<string>()) {
	const order = Object.keys(names)
	const found: (Knob & { rank: number })[] = []
	for (const path of all.keys()) {
		if (!path.startsWith(`${prefix}.`)) continue
		const key = path.slice(prefix.length + 1)
		if (skip.has(key)) continue
		const [label, hint] = names[key] ?? [key, ""]
		const rank = order.indexOf(key)
		found.push({ path, label, hint, rank: rank < 0 ? order.length : rank })
	}
	return found
		.sort((a, b) => a.rank - b.rank)
		.map(({ path, label, hint }) => ({ path, label, hint }))
}

/** The sections of the tuning window, for the jobs and Sentinels in a world. */
export function sections(world: World): Section[] {
	const { rules } = world
	const all = numbers(rules)
	const jobs = [...new Set(world.heroes.flatMap((u) => (u.hero ? [u.hero.job.id] : [])))]
	const abilities = jobs.flatMap((id) => rules.jobs[id].abilities)
	const tiers = ([1, 2, 3, 4] as const).filter((tier) =>
		world.units.some((u) => u.stats === rules.sentinels[tier])
	)
	const creepTitle = (kind: CreepKind) =>
		`${CREEP_TITLES[kind]} (${CREEP_NAMES.radiant[kind]}, ${CREEP_NAMES.dire[kind]})`
	return [
		{
			title: "Rules",
			groups: [{ title: null, knobs: knobs(all, "tuning", RULES, new Set(["laneCorridor"])) }]
		},
		{
			title: "Heroes",
			groups: jobs.map((id) => ({
				title: `${rules.jobs[id].race} ${rules.jobs[id].name}`,
				knobs: knobs(all, `jobs.${id}.stats`, STATS, UNUSED.hero)
			}))
		},
		{
			title: "Abilities",
			groups: abilities.map((id) => ({
				title: rules.abilities[id].name,
				knobs: knobs(all, `abilities.${id}`, ABILITY)
			}))
		},
		{
			title: "Statuses",
			groups: Object.values(rules.statuses).map((status) => ({
				title: status.name,
				knobs: knobs(all, `statuses.${status.id}`, STATUS)
			}))
		},
		{
			title: "Creeps",
			groups: (Object.keys(rules.creeps) as CreepKind[]).map((kind) => ({
				title: creepTitle(kind),
				knobs: knobs(all, `creeps.${kind}`, STATS, UNUSED.creep)
			}))
		},
		{
			title: "Sentinels",
			groups: tiers.map((tier) => ({
				title: `Sentinel T${String(tier)}`,
				knobs: knobs(all, `sentinels.${String(tier)}`, STATS, UNUSED.sentinel)
			}))
		}
	]
}

/** Whether a number may go below 0: only a status's change to speed. */
export const signed = (path: string): boolean => /^statuses\.\w+\.speed$/.test(path)
