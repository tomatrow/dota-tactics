/**
 * Plays the slice (DESIGN.md §11) on the real map with the scripted AI on both heroes, and prints
 * who won and when, each hero's farm, kills and deaths, and how it spent its time: what the AI
 * was about, walking, and holding a full gauge (the §11 questions, milestone 6's telemetry).
 *
 *   node scripts/duel-sim.ts [--minutes 30] [--seeds 6] [--radiant warrior] [--dire blackMage]
 *                            [--trace 1]
 *
 * `--trace <seed>` prints that game's kills, deaths, Sentinels' falls and the AI's changes of
 * mind as they happen.
 */
import { parseArgs } from "node:util"
import { ABILITIES } from "#lib/content/abilities.ts"
import { isJobId, type JobId } from "#lib/content/heroes.ts"
import type { Team } from "#lib/content/units.ts"
import { GAUGE_FULL, TICK_RATE } from "#lib/sim/constants.ts"
import { HeroAI, type Intent } from "#lib/sim/hero-ai.ts"
import { mapScenario, SLICE } from "#lib/sim/scenario.ts"
import type { Unit } from "#lib/sim/unit.ts"
import { World } from "#lib/sim/world.ts"
import { loadMapFromDisk } from "#lib/testing/map.ts"

const { values } = parseArgs({
	options: {
		minutes: { type: "string", default: "30" },
		seeds: { type: "string", default: "6" },
		radiant: { type: "string", default: "warrior" },
		dire: { type: "string", default: "blackMage" },
		trace: { type: "string" }
	}
})
const minutes = Number(values.minutes)
const seeds = Number(values.seeds)
const job = (id: string): JobId => {
	if (!isJobId(id)) throw new Error(`no job ${id}`)
	return id
}
const jobs: Record<Team, JobId> = { radiant: job(values.radiant), dire: job(values.dire) }
const traced = values.trace === undefined ? null : Number(values.trace)

const model = loadMapFromDisk()
const scenario = mapScenario(model, {
	...SLICE,
	heroes: [
		{ team: "radiant", job: jobs.radiant },
		{ team: "dire", job: jobs.dire }
	]
})

const clock = (tick: number) => {
	const s = Math.round(tick / TICK_RATE)
	return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}`
}

interface HeroRecord {
	readonly unit: Unit
	actions: number
	/** Damage it did to the enemy hero. */
	heroDamage: number
	/** Damage it took, by what dealt it. */
	taken: { hero: number; creeps: number; sentinels: number }
	/** Ticks alive, walking, and holding a full gauge (standing, not casting). */
	alive: number
	walking: number
	full: number
	intents: Map<Intent, number>
}

interface Result {
	readonly seed: number
	readonly winner: Team | null
	readonly ticks: number
	readonly heroes: readonly HeroRecord[]
	readonly towers: readonly { team: Team; hp: number }[]
	readonly msPerTick: number
}

function play(seed: number): Result {
	const world = new World(scenario, seed)
	const ais = world.heroes.map((unit) => new HeroAI(world, unit))
	const records = new Map<Unit, HeroRecord>(
		world.heroes.map((unit) => [
			unit,
			{
				unit,
				actions: 0,
				heroDamage: 0,
				taken: { hero: 0, creeps: 0, sentinels: 0 },
				alive: 0,
				walking: 0,
				full: 0,
				intents: new Map()
			}
		])
	)
	const trace = seed === traced
	if (trace) {
		const command = world.command.bind(world)
		world.command = (hero, c) => {
			console.log(`${clock(world.tick)} ${world.unit(hero)?.team ?? "?"} → ${JSON.stringify(c)}`)
			command(hero, c)
		}
	}
	const said = new Map<Unit, Intent>()
	const total = minutes * 60 * TICK_RATE
	const started = performance.now()
	while (world.tick < total && world.winner === null) {
		for (const ai of ais) ai.update()
		const tick = world.tick
		for (const event of world.step()) {
			switch (event.type) {
				case "attack":
				case "magic": {
					const record = records.get(event.attacker)
					if (record && event.target.hero) record.heroDamage += event.damage
					if (record && event.type === "attack") record.actions++
					const victim = records.get(event.target)
					if (victim) {
						const { attacker } = event
						const source =
							attacker.hero ? "hero"
							: attacker.stats.structure ? "sentinels"
							: "creeps"
						victim.taken[source] += event.damage
					}
					break
				}
				case "charge":
				case "heal":
				case "spell": {
					// A charged spell is one action, counted when its charge starts.
					const charged = event.type === "spell" && ABILITIES[event.ability].charge > 0
					const record = records.get(event.unit)
					if (record && !charged) record.actions++
					break
				}
				case "death":
					if (trace && (event.unit.hero || event.unit.stats.structure)) {
						const by = event.killer ? ` by ${event.killer.name}` : ""
						console.log(`${clock(tick)} ${event.unit.team} ${event.unit.name} dies${by}`)
					}
					break
				case "victory":
					if (trace) console.log(`${clock(tick)} ${event.team} wins`)
					break
			}
		}
		for (const ai of ais) {
			const record = records.get(ai.unit)
			if (!record || !ai.unit.alive) continue
			record.alive++
			if (ai.unit.step) record.walking++
			else if (ai.unit.gauge >= GAUGE_FULL && !ai.unit.casting) record.full++
			record.intents.set(ai.intent, (record.intents.get(ai.intent) ?? 0) + 1)
			if (trace && said.get(ai.unit) !== ai.intent) {
				said.set(ai.unit, ai.intent)
				const { hp, mp } = ai.unit
				console.log(
					`${clock(tick)} ${ai.unit.team.padEnd(7)} ${ai.intent.padEnd(8)} HP ${String(hp)} MP ${String(mp)} at ${String([ai.unit.col, ai.unit.row])}`
				)
			}
		}
	}
	const msPerTick = (performance.now() - started) / world.tick
	return {
		seed,
		winner: world.winner,
		ticks: world.tick,
		heroes: [...records.values()],
		towers: world.units.filter((u) => u.stats.structure).map((u) => ({ team: u.team, hp: u.hp })),
		msPerTick
	}
}

const results = Array.from({ length: seeds }, (_, i) => play(i + 1))

const percent = (part: number, whole: number) =>
	whole === 0 ? "—" : `${String(Math.round((part / whole) * 100))}%`

console.log(
	`Slice, AI vs AI: Radiant ${jobs.radiant}, Dire ${jobs.dire}; up to ${String(minutes)} min × ${String(seeds)} seeds.\n`
)
for (const r of results) {
	const end = r.winner ? `${r.winner} wins at ${clock(r.ticks)}` : `no winner by ${clock(r.ticks)}`
	console.log(`seed ${String(r.seed)}: ${end}; ${r.msPerTick.toFixed(3)} ms/tick`)
	for (const h of r.heroes) {
		const hero = h.unit.hero
		if (!hero) continue
		const minutesAlive = h.alive / TICK_RATE / 60
		const top = [...h.intents.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([intent, n]) => `${intent} ${percent(n, h.alive)}`)
			.join(", ")
		console.log(
			`  ${h.unit.team.padEnd(7)} ${h.unit.name.padEnd(18)} K/D ${String(hero.kills)}/${String(hero.deaths)} ` +
				`LH/DN ${String(hero.lastHits)}/${String(hero.denies)} ${String(hero.gold)} g; ` +
				`${(h.actions / Math.max(minutesAlive, 1e-9)).toFixed(1)} actions/min, ` +
				`${String(h.heroDamage)} to the hero; took ${String(h.taken.hero)} / ${String(h.taken.creeps)} / ` +
				`${String(h.taken.sentinels)} (hero / creeps / Sentinels); walking ${percent(h.walking, h.alive)}, ` +
				`full gauge ${percent(h.full, h.alive)}; ${top}`
		)
	}
	const towers = r.towers.map((t) => `${t.team} T1 ${String(t.hp)}`).join(", ")
	if (towers) console.log(`  ${towers}`)
}

console.log("\nAverages per game:")
for (const team of ["radiant", "dire"] as const) {
	const heroes = results.flatMap((r) => r.heroes.filter((h) => h.unit.team === team))
	const mean = (f: (h: HeroRecord) => number) =>
		heroes.reduce((sum, h) => sum + f(h), 0) / Math.max(1, heroes.length)
	const share = (f: (h: HeroRecord) => number) =>
		percent(
			heroes.reduce((sum, h) => sum + f(h), 0),
			heroes.reduce((sum, h) => sum + h.alive, 0)
		)
	console.log(
		`  ${team.padEnd(7)} ${jobs[team].padEnd(10)} K/D ${mean((h) => h.unit.hero?.kills ?? 0).toFixed(1)}/` +
			`${mean((h) => h.unit.hero?.deaths ?? 0).toFixed(1)}, LH/DN ${mean((h) => h.unit.hero?.lastHits ?? 0).toFixed(0)}/` +
			`${mean((h) => h.unit.hero?.denies ?? 0).toFixed(0)}, ${mean((h) => h.heroDamage).toFixed(0)} to the hero, took ` +
			`${mean((h) => h.taken.hero).toFixed(0)} / ${mean((h) => h.taken.creeps).toFixed(0)} / ` +
			`${mean((h) => h.taken.sentinels).toFixed(0)}; ` +
			`${(mean((h) => h.actions) / Math.max(1e-9, mean((h) => h.alive) / TICK_RATE / 60)).toFixed(1)} actions/min, ` +
			`walking ${share((h) => h.walking)}, full gauge ${share((h) => h.full)}`
	)
}

const wins = (team: Team) => results.filter((r) => r.winner === team).length
const ends = results.filter((r) => r.winner).map((r) => r.ticks)
console.log(
	`\nRadiant ${jobs.radiant} won ${String(wins("radiant"))}, Dire ${jobs.dire} won ${String(wins("dire"))}, ` +
		`${String(seeds - wins("radiant") - wins("dire"))} unfinished` +
		(ends.length > 0 ? `; games ended ${clock(Math.min(...ends))}–${clock(Math.max(...ends))}` : "")
)
