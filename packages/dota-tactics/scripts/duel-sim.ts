/**
 * Plays the slice (DESIGN.md §11) on the real map with the scripted AI on both heroes, and prints
 * who won and when, each hero's farm, kills and deaths, and how it spent its time: what the AI
 * was about, and the §11 questions' telemetry (walking, charging, a full gauge's waits).
 *
 *   node scripts/duel-sim.ts [--minutes 30] [--seeds 6] [--radiant warrior] [--dire blackMage]
 *                            [--trace 1] [--tune tuning.walkCharge:50,jobs.warrior.stats.speed:24]
 *
 * `--trace <seed>` prints that game's kills, deaths, Sentinels' falls and the AI's changes of
 * mind as they happen. `--tune` changes numbers, as the game's `?tune=` does.
 */
import { parseArgs } from "node:util"
import { isJobId, type JobId } from "#lib/content/heroes.ts"
import { defaultRules, parseChanges, setNumber } from "#lib/content/rules.ts"
import type { Team } from "#lib/content/units.ts"
import { TICK_RATE } from "#lib/sim/constants.ts"
import { HeroAI, type Intent } from "#lib/sim/hero-ai.ts"
import { mapScenario, SLICE } from "#lib/sim/scenario.ts"
import { Telemetry, type Summary } from "#lib/sim/telemetry.ts"
import type { Unit } from "#lib/sim/unit.ts"
import { World } from "#lib/sim/world.ts"
import { loadMapFromDisk } from "#lib/testing/map.ts"

const { values } = parseArgs({
	options: {
		minutes: { type: "string", default: "30" },
		seeds: { type: "string", default: "6" },
		radiant: { type: "string", default: "warrior" },
		dire: { type: "string", default: "blackMage" },
		trace: { type: "string" },
		tune: { type: "string", default: "" }
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
const tuned = parseChanges(values.tune)
for (const [path] of tuned) {
	if (!setNumber(defaultRules(), path, 0)) throw new Error(`no number at ${path}`)
}

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
	/** Damage it did to the enemy hero. */
	heroDamage: number
	/** Damage it took, by what dealt it. */
	taken: { hero: number; creeps: number; sentinels: number }
	/** Ticks alive, and with each intent. */
	alive: number
	intents: Map<Intent, number>
	time: Summary | null
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
	const rules = defaultRules()
	for (const [path, value] of tuned) setNumber(rules, path, value)
	const world = new World(scenario, seed, rules)
	const ais = world.heroes.map((unit) => new HeroAI(world, unit))
	const telemetry = new Telemetry(world)
	const records = new Map<Unit, HeroRecord>(
		world.heroes.map((unit) => [
			unit,
			{
				unit,
				heroDamage: 0,
				taken: { hero: 0, creeps: 0, sentinels: 0 },
				alive: 0,
				intents: new Map(),
				time: null
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
		const events = world.step()
		telemetry.record(events)
		for (const event of events) {
			switch (event.type) {
				case "attack":
				case "magic": {
					const record = records.get(event.attacker)
					if (record && event.target.hero) record.heroDamage += event.damage
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
	for (const record of records.values()) record.time = telemetry.summary(record.unit)
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

/** The telemetry, in a line: actions a minute (of the most), shares of time, the waits. */
const timeLine = (t: Summary | null) =>
	t === null ? "" : (
		`${t.actionsPerMinute.toFixed(1)}/${t.mostPerMinute.toFixed(0)} actions/min; walking ${percent(t.walking, 1)}, ` +
		`charging ${percent(t.charging, 1)}, full ${percent(t.full, 1)} (standing ${percent(t.ready, 1)}), ` +
		`casting ${percent(t.casting, 1)}; acted as it filled ${percent(t.prompt, 1)}, median wait ${t.medianWait.toFixed(1)} s`
	)

const changed = tuned.map(([path, value]) => `${path} ${String(value)}`).join(", ")
console.log(
	`Slice, AI vs AI: Radiant ${jobs.radiant}, Dire ${jobs.dire}; up to ${String(minutes)} min × ${String(seeds)} seeds.` +
		(changed ? `\nTuned: ${changed}.` : "") +
		"\n"
)
for (const r of results) {
	const end = r.winner ? `${r.winner} wins at ${clock(r.ticks)}` : `no winner by ${clock(r.ticks)}`
	console.log(`seed ${String(r.seed)}: ${end}; ${r.msPerTick.toFixed(3)} ms/tick`)
	for (const h of r.heroes) {
		const hero = h.unit.hero
		if (!hero) continue
		const top = [...h.intents.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([intent, n]) => `${intent} ${percent(n, h.alive)}`)
			.join(", ")
		console.log(
			`  ${h.unit.team.padEnd(7)} ${h.unit.name.padEnd(18)} K/D ${String(hero.kills)}/${String(hero.deaths)} ` +
				`LH/DN ${String(hero.lastHits)}/${String(hero.denies)} ${String(hero.gold)} g; ` +
				`${String(h.heroDamage)} to the hero; took ${String(h.taken.hero)} / ${String(h.taken.creeps)} / ` +
				`${String(h.taken.sentinels)} (hero / creeps / Sentinels); ${top}\n    ${timeLine(h.time)}`
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
	const times = heroes.flatMap((h) => (h.time ? [h.time] : []))
	const average = (key: Exclude<keyof Summary, "buckets">) =>
		times.reduce((sum, t) => sum + t[key], 0) / Math.max(1, times.length)
	const time: Summary = {
		minutes: average("minutes"),
		actions: average("actions"),
		actionsPerMinute: average("actionsPerMinute"),
		mostPerMinute: average("mostPerMinute"),
		walking: average("walking"),
		charging: average("charging"),
		ready: average("ready"),
		casting: average("casting"),
		full: average("full"),
		prompt: average("prompt"),
		medianWait: average("medianWait"),
		buckets: []
	}
	console.log(
		`  ${team.padEnd(7)} ${jobs[team].padEnd(10)} K/D ${mean((h) => h.unit.hero?.kills ?? 0).toFixed(1)}/` +
			`${mean((h) => h.unit.hero?.deaths ?? 0).toFixed(1)}, LH/DN ${mean((h) => h.unit.hero?.lastHits ?? 0).toFixed(0)}/` +
			`${mean((h) => h.unit.hero?.denies ?? 0).toFixed(0)}, ${mean((h) => h.heroDamage).toFixed(0)} to the hero, took ` +
			`${mean((h) => h.taken.hero).toFixed(0)} / ${mean((h) => h.taken.creeps).toFixed(0)} / ` +
			`${mean((h) => h.taken.sentinels).toFixed(0)}\n    ${timeLine(time)}`
	)
}

const wins = (team: Team) => results.filter((r) => r.winner === team).length
const ends = results.filter((r) => r.winner).map((r) => r.ticks)
console.log(
	`\nRadiant ${jobs.radiant} won ${String(wins("radiant"))}, Dire ${jobs.dire} won ${String(wins("dire"))}, ` +
		`${String(seeds - wins("radiant") - wins("dire"))} unfinished` +
		(ends.length > 0 ? `; games ended ${clock(Math.min(...ends))}–${clock(Math.max(...ends))}` : "")
)
