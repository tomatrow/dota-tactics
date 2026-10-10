/**
 * Runs the slice's mid lane on the real map with no heroes, and prints what DESIGN.md §6 tunes
 * for: when the waves first meet, how long a wave's fight lasts, where the front sits, and how
 * the Sentinels fare.
 *
 *   node scripts/lane-sim.ts [--minutes 10] [--seeds 5] [--timeline]
 */
import { parseArgs } from "node:util"
import { TUNING } from "#lib/content/tuning.ts"
import type { Team } from "#lib/content/units.ts"
import { TICK_RATE } from "#lib/sim/constants.ts"
import { mapScenario, SLICE } from "#lib/sim/scenario.ts"
import type { Unit } from "#lib/sim/unit.ts"
import { World } from "#lib/sim/world.ts"
import { loadMapFromDisk } from "#lib/testing/map.ts"

const { values } = parseArgs({
	options: {
		minutes: { type: "string", default: "10" },
		seeds: { type: "string", default: "5" },
		timeline: { type: "boolean", default: false }
	}
})
const minutes = Number(values.minutes)
const seeds = Number(values.seeds)

const model = loadMapFromDisk()
const scenario = mapScenario(model, { ...SLICE, heroes: [] })

const clock = (tick: number) => {
	const s = Math.round(tick / TICK_RATE)
	return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}`
}

interface WaveRecord {
	alive: number
	firstFight: number
	wiped: number
}

interface Result {
	seed: number
	firstContact: { tick: number; front: number } | null
	/** Seconds from a wave's first fight to its last creep's death, per team. */
	fights: Record<Team, number[]>
	/** Mean front position per 30 s window (null when nobody fought). */
	fronts: (number | null)[]
	towers: { name: string; firstHit: number; death: number; hp: number; maxHp: number }[]
	alive: Record<Team, number>
	msPerTick: number
}

function simulate(seed: number): Result {
	const world = new World(scenario, seed)
	const radiantT1 = world.units.find((u) => u.entity === "dota_goodguys_tower1_mid")
	const direT1 = world.units.find((u) => u.entity === "dota_badguys_tower1_mid")
	if (!radiantT1 || !direT1) throw new Error("the slice needs both mid T1s")
	// Where a tile sits between the two T1s: 0 at Radiant's, 1 at Dire's.
	const [rc, rr] = [radiantT1.col, radiantT1.row]
	const [dc, dr] = [direT1.col - rc, direT1.row - rr]
	const front = (u: Unit) => ((u.col - rc) * dc + (u.row - rr) * dr) / (dc * dc + dr * dr)

	const waves = new Map<string, WaveRecord>()
	const key = (u: Unit) => `${u.team}:${String(u.wave)}`
	const towers = [radiantT1, direT1].map((u) => ({
		unit: u,
		firstHit: -1,
		death: -1
	}))
	let firstContact: Result["firstContact"] = null
	const window = TUNING.waveInterval * TICK_RATE
	const fronts: (number | null)[] = []
	let sum = 0
	let count = 0

	const total = minutes * 60 * TICK_RATE
	const started = performance.now()
	for (let i = 0; i < total; i++) {
		const tick = world.tick
		for (const event of world.step()) {
			if (event.type === "spawn" && event.unit.wave >= 0) {
				const record = waves.get(key(event.unit)) ?? { alive: 0, firstFight: -1, wiped: -1 }
				record.alive++
				waves.set(key(event.unit), record)
			} else if (event.type === "attack") {
				const { attacker, target } = event
				for (const u of [attacker, target]) {
					const record = waves.get(key(u))
					if (record && record.firstFight < 0) record.firstFight = tick
				}
				const creeps = !attacker.stats.structure && !target.stats.structure
				if (creeps) {
					firstContact ??= { tick, front: front(target) }
					sum += front(target)
					count++
				}
				for (const t of towers) if (t.unit === target && t.firstHit < 0) t.firstHit = tick
			} else if (event.type === "death") {
				const record = waves.get(key(event.unit))
				if (record && --record.alive === 0) record.wiped = tick
				for (const t of towers) if (t.unit === event.unit) t.death = tick
			}
		}
		if ((tick + 1) % window === 0) {
			fronts.push(count > 0 ? sum / count : null)
			sum = 0
			count = 0
		}
	}
	const msPerTick = (performance.now() - started) / total

	const fights: Result["fights"] = { radiant: [], dire: [] }
	for (const [k, record] of waves) {
		if (record.firstFight < 0 || record.wiped < 0) continue
		const team = k.split(":")[0] as Team
		fights[team].push((record.wiped - record.firstFight) / TICK_RATE)
	}
	const alive: Result["alive"] = { radiant: 0, dire: 0 }
	for (const u of world.units) if (!u.stats.structure) alive[u.team]++

	return {
		seed,
		firstContact,
		fights,
		fronts,
		towers: towers.map((t) => ({
			name: t.unit.team === "radiant" ? "Radiant T1" : "Dire T1",
			firstHit: t.firstHit,
			death: t.death,
			hp: t.unit.hp,
			maxHp: t.unit.stats.hp
		})),
		alive,
		msPerTick
	}
}

const median = (xs: number[]) => {
	if (xs.length === 0) return NaN
	const s = [...xs].sort((a, b) => a - b)
	return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}
const fixed = (x: number | null, digits = 2) =>
	x === null || Number.isNaN(x) ? "—" : x.toFixed(digits)

console.log(`Mid lane, T1s only, no heroes; ${String(minutes)} min × ${String(seeds)} seeds.`)
console.log("Front: 0 = at Radiant T1, 1 = at Dire T1, 0.5 = halfway.\n")

const results = Array.from({ length: seeds }, (_, i) => simulate(i + 1))
for (const r of results) {
	const contact =
		r.firstContact ? `${clock(r.firstContact.tick)} at ${fixed(r.firstContact.front)}` : "never"
	const towers = r.towers
		.map((t) =>
			t.death >= 0 ?
				`${t.name} falls ${clock(t.death)}`
			:	`${t.name} ${String(t.hp)}/${String(t.maxHp)}`
		)
		.join(", ")
	console.log(
		`seed ${String(r.seed)}: contact ${contact}; wave fight median R ${fixed(median(r.fights.radiant), 0)}s D ${fixed(median(r.fights.dire), 0)}s; ` +
			`front at end ${fixed(r.fronts.findLast((f) => f !== null) ?? null)}; ${towers}; ` +
			`alive R ${String(r.alive.radiant)} D ${String(r.alive.dire)}; ${r.msPerTick.toFixed(3)} ms/tick`
	)
}

const falls = results.flatMap((r) => r.towers.filter((t) => t.death >= 0).map((t) => t.death))
const fallen = results.filter((r) => r.towers.some((t) => t.death >= 0)).length
const all = (team: Team) => results.flatMap((r) => r.fights[team])
console.log(
	`\nAll seeds: wave fight median ${fixed(median([...all("radiant"), ...all("dire")]), 0)}s ` +
		`(target ~${String(TUNING.waveInterval)}s); first contact median ` +
		`${clock(median(results.flatMap((r) => (r.firstContact ? [r.firstContact.tick] : []))))}; ` +
		`a T1 fell in ${String(fallen)} of ${String(seeds)} seeds` +
		(falls.length > 0 ? ` (earliest ${clock(Math.min(...falls))})` : "")
)

if (values.timeline) {
	const r = results[0]
	console.log(`\nSeed ${String(r.seed)}, front per ${String(TUNING.waveInterval)} s:`)
	r.fronts.forEach((f, i) => {
		const at = f === null ? "" : " ".repeat(Math.round(f * 40)) + "|"
		console.log(`${clock((i + 1) * TUNING.waveInterval * TICK_RATE).padStart(6)} ${fixed(f)} ${at}`)
	})
	for (const t of r.towers) {
		console.log(
			`${t.name}: first hit ${t.firstHit >= 0 ? clock(t.firstHit) : "never"}, ` +
				(t.death >= 0 ? `falls ${clock(t.death)}` : `${String(t.hp)}/${String(t.maxHp)} HP at end`)
		)
	}
}
