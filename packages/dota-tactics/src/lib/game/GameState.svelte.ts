import { createContext } from "svelte"
import { SvelteSet } from "svelte/reactivity"
import type { MapModel } from "dota-tactics-grid/map/model.ts"
import { sceneY, tileX, tileZ } from "dota-tactics-grid/scene/coords.ts"
import { WATER_DEPTH } from "dota-tactics-grid/scene/water.ts"
import type { ViewerState } from "dota-tactics-grid/state.svelte.ts"
import { hitsStructures, type Ability, type AbilityId } from "#lib/content/abilities.ts"
import { JOB_IDS, type JobId } from "#lib/content/heroes.ts"
import {
	changes,
	defaultRules,
	formatChanges,
	setNumber,
	type Change,
	type Rules
} from "#lib/content/rules.ts"
import { STATUSES } from "#lib/content/statuses.ts"
import type { Team } from "#lib/content/units.ts"
import type { Command } from "#lib/sim/commands.ts"
import { STEP_FULL, TICK_RATE, TICK_SECONDS } from "#lib/sim/constants.ts"
import type { SimEvent } from "#lib/sim/events.ts"
import { HeroAI, type Intent } from "#lib/sim/hero-ai.ts"
import { mapScenario, SLICE } from "#lib/sim/scenario.ts"
import { Telemetry } from "#lib/sim/telemetry.ts"
import type { Unit } from "#lib/sim/unit.ts"
import { World } from "#lib/sim/world.ts"
import type { Vec3 } from "./camera.ts"
import { bodyHeight } from "./units.ts"

/** The longest frame the game catches up on; a longer one (a background tab) is dropped. */
const MAX_FRAME = 0.25

/** How long (game seconds) an attack's effect lasts. */
export const ATTACK_EFFECT = 0.3

/** How long (game seconds) a heal's burst lasts. */
export const HEAL_EFFECT = 0.6

/** How long (game seconds) a pop-up lasts. */
export const POPUP_TIME = 1.2

/** How long (game seconds) a spell's flames or ice last. */
export const SPELL_EFFECT = 0.8

/** How long (game seconds) a hit flashes. */
const FLASH = 0.12

/** How long (game seconds) a notice stays up. */
const NOTICE_TIME = 5

/** What the AI's hero is about, in words, for the unit window. */
const INTENTS: Record<Intent, string> = {
	dead: "Fallen",
	casting: "Casting",
	dodge: "Dodging a spell",
	retreat: "Retreating to heal",
	mend: "Healing",
	evade: "Backing off",
	kill: "Going for the kill",
	trade: "Trading blows",
	lastHit: "Last-hitting",
	deny: "Denying",
	push: "Pushing",
	siege: "Attacking the Sentinel",
	bank: "Hitting creeps for MP",
	lane: "Holding the lane"
}

/** An attack, or a spell's damage to one unit, the view is still showing. */
export interface AttackEffect {
	readonly attacker: Unit
	readonly target: Unit
	readonly hit: boolean
	readonly ability: AbilityId | null
	/** Magic lands at once, with no projectile. */
	readonly magic: boolean
	/** Game time (seconds) it happened. */
	readonly at: number
}

/** A heal the view is still showing. */
export interface HealEffect {
	readonly unit: Unit
	readonly at: number
}

/** A spell landing: flames or ice on its tiles. */
export interface SpellEffect {
	readonly ability: Ability
	readonly col: number
	readonly row: number
	readonly at: number
}

/**
 * Text rising over a unit: gold or "!" over a creep the player's hero killed; damage the hero deals
 * or takes, or "Miss"; a status taking hold.
 */
export interface Popup {
	readonly id: number
	readonly kind: "gold" | "deny" | "dealt" | "taken" | "miss" | "status"
	readonly text: string
	readonly position: Vec3
	readonly at: number
}

/** A line at the top of the screen: a hero slain, a Sentinel fallen. */
export interface Notice {
	readonly id: number
	readonly text: string
	/** Good or bad news for the player's team. */
	readonly good: boolean
	readonly at: number
}

/** What a left-click picks, after an ability key or A. */
export type Targeting =
	{ readonly kind: "ability"; readonly ability: Ability } | { readonly kind: "attackMove" }

/** Where the last order went, flashed on the board: a tile walked to, or a unit attacked. */
export interface OrderMark {
	readonly kind: "move" | "attack"
	readonly col: number
	readonly row: number
	readonly unit: Unit | null
	/** `performance.now()` when it was given: the mark fades in real time, paused or not. */
	readonly at: number
}

/** The game speeds the clock offers; 0 is paused. */
export const SPEEDS = [0, 0.5, 1, 2, 4, 8] as const

type Speed = (typeof SPEEDS)[number]

/**
 * One game: the board's viewer state (which the board's components read), the simulation, the
 * player's hero and the AI that plays the other, and what the view and input share. Each frame
 * `advance` runs the world's fixed ticks for the time that passed, the AI deciding before each;
 * positions between ticks are interpolated. Input becomes commands to the hero. The game stops
 * when a team wins. Its numbers can be tuned while it runs, and telemetry counts how the heroes
 * spend their time (DESIGN.md §11, milestone 6).
 */
export class GameState {
	readonly model: MapModel
	readonly view: ViewerState
	readonly world: World
	readonly seed: number
	/** The player's job. */
	readonly job: JobId
	/** The player's hero. */
	readonly hero: Unit
	/** The other hero, and the AI that plays it (DESIGN.md §11). */
	readonly opponent: Unit
	readonly ai: HeroAI
	readonly telemetry: Telemetry
	/** The content's numbers, which the world's started as before `?tune=`. */
	readonly defaults: Rules = defaultRules()
	/** Game seconds per real second; 0 is paused. */
	speed = $state<Speed>(1)
	/** Counts changes to the numbers, for what shows them: the world's rules aren't reactive. */
	retuned = $state(0)
	/** The tuning window is open. */
	tuning = $state(false)
	/** The world's tick, mirrored for the HUD: everything that reads it updates each tick. */
	tick = $state(0)
	/** The living units, reassigned when one appears or dies. */
	roster = $state.raw<readonly Unit[]>([])
	/** Destroyed buildings' entity names. */
	readonly fallen = new SvelteSet<string>()
	/** The unit whose details the HUD shows. Commands always go to the hero. */
	selected = $state.raw<Unit | null>(null)
	/** The unit under the pointer. */
	hovered = $state.raw<Unit | null>(null)
	targeting = $state.raw<Targeting | null>(null)
	mark = $state.raw<OrderMark | null>(null)
	popups = $state.raw<readonly Popup[]>([])
	notices = $state.raw<readonly Notice[]>([])
	/** The team that won, once one has. */
	winner = $state<Team | null>(null)
	/** Space is held: the camera stays centred on the hero. */
	following = $state(false)
	/** What the camera centres on, in scene coordinates: the hero, or its Clan Hall while it's dead. */
	focus: Vec3 = [0, 0, 0]
	/** How far into the next tick the game is, 0–1, for interpolation. */
	alpha = 0
	/** Attacks still being drawn, oldest first. */
	effects: AttackEffect[] = []
	/** Heals still being drawn, oldest first. */
	heals: HealEffect[] = []
	/** Spells still being drawn, oldest first. */
	spells: SpellEffect[] = []
	/**
	 * Where a tile ability would land, while one waits for its target: the tile or enemy under the
	 * pointer. Set by the input each frame.
	 */
	aim: readonly [col: number, row: number] | null = null
	#accumulator = 0
	#popupId = 0
	#noticeId = 0
	/** The speed F9 resumes at. */
	#resume: Speed = 1

	/**
	 * A game where the player plays `job` for `side`, and the AI the other job (the slice's
	 * matchup, §11) for the other side, with the content's numbers but for `tune`'s.
	 */
	constructor(
		view: ViewerState,
		seed: number,
		job: JobId = "warrior",
		side: Team = "radiant",
		tune: readonly Change[] = []
	) {
		this.view = view
		this.model = view.model
		this.seed = seed
		this.job = job
		const other: Team = side === "radiant" ? "dire" : "radiant"
		const rival = JOB_IDS.find((id) => id !== job) ?? job
		const scenario = mapScenario(this.model, {
			...SLICE,
			heroes: [
				{ team: side, job },
				{ team: other, job: rival }
			]
		})
		const rules = defaultRules()
		for (const [path, value] of tune) setNumber(rules, path, value)
		this.world = new World(scenario, seed, rules)
		const hero = this.world.heroes.find((u) => u.team === side)
		const opponent = this.world.heroes.find((u) => u.team === other)
		if (!hero || !opponent) throw new Error("the scenario needs a hero on each side")
		this.hero = hero
		this.opponent = opponent
		this.ai = new HeroAI(this.world, opponent)
		this.telemetry = new Telemetry(this.world)
		this.selected = hero
		this.roster = [...this.world.units]
		this.focus = this.position(hero)
	}

	/** Game seconds, between ticks included. */
	get time(): number {
		return (this.world.tick + this.alpha) / TICK_RATE
	}

	/** Seconds until the next wave. */
	get nextWave(): number {
		return (this.world.nextWave - this.tick) / TICK_RATE
	}

	/** Moves the game on by `delta` real seconds. */
	advance(delta: number) {
		this.#accumulator += Math.min(delta, MAX_FRAME) * this.speed
		let changed = false
		while (this.#accumulator >= TICK_SECONDS && this.winner === null) {
			this.#accumulator -= TICK_SECONDS
			changed = this.#tick() || changed
		}
		if (this.winner !== null) this.#accumulator = 0
		this.#refresh(changed)
	}

	/** F10: pauses, and moves the game on by one tick. */
	step() {
		this.pause()
		this.#accumulator = 0
		this.#refresh(this.winner === null && this.#tick())
	}

	/**
	 * One tick: the AI decides, the world steps, and the view and telemetry take in what happened;
	 * true when the roster changed.
	 */
	#tick(): boolean {
		this.ai.update()
		const events = this.world.step()
		this.telemetry.record(events)
		let changed = false
		for (const event of events) changed = this.#handle(event) || changed
		this.tick = this.world.tick
		return changed
	}

	/** Brings what the view reads up to the world: the roster, effects still showing, the focus. */
	#refresh(changed: boolean) {
		this.alpha = this.#accumulator / TICK_SECONDS
		if (changed) this.roster = [...this.world.units]

		const time = this.time
		while (this.effects.length > 0 && this.effects[0].at < time - ATTACK_EFFECT)
			this.effects.shift()
		while (this.heals.length > 0 && this.heals[0].at < time - HEAL_EFFECT) this.heals.shift()
		while (this.spells.length > 0 && this.spells[0].at < time - SPELL_EFFECT) this.spells.shift()
		if (this.popups.length > 0 && this.popups[0].at < time - POPUP_TIME) {
			this.popups = this.popups.filter((p) => p.at >= time - POPUP_TIME)
		}
		if (this.notices.length > 0 && this.notices[0].at < time - NOTICE_TIME) {
			this.notices = this.notices.filter((n) => n.at >= time - NOTICE_TIME)
		}

		const { hero } = this
		const hall = hero.hero?.hall ?? [hero.col, hero.row]
		this.focus = hero.alive ? this.position(hero) : this.toScene(...hall)
	}

	/** Applies one event to what the view keeps; true when the roster changed. */
	#handle(event: SimEvent): boolean {
		const at = this.world.tick / TICK_RATE
		switch (event.type) {
			case "act":
				return false
			case "spawn":
				if (event.unit === this.hero) this.selected ??= this.hero
				return true
			case "attack":
				this.effects.push({
					attacker: event.attacker,
					target: event.target,
					hit: event.hit,
					ability: event.ability,
					magic: false,
					at
				})
				this.#hitPopup(event.attacker, event.target, event.hit, event.damage, at)
				return false
			case "magic":
				this.effects.push({
					attacker: event.attacker,
					target: event.target,
					hit: true,
					ability: event.ability,
					magic: true,
					at
				})
				this.#hitPopup(event.attacker, event.target, true, event.damage, at)
				return false
			case "spell":
				this.spells.push({
					ability: this.world.rules.abilities[event.ability],
					col: event.col,
					row: event.row,
					at
				})
				return false
			case "status":
				this.#popup(event.unit, "status", STATUSES[event.status].name, at, 0.35)
				return false
			case "heal":
				this.heals.push({ unit: event.unit, at })
				return false
			case "charge":
			case "recoil":
				return false
			case "death": {
				const { unit, killer } = event
				if (unit.entity) this.fallen.add(unit.entity)
				if (this.selected === unit) this.selected = null
				if (this.hovered === unit) this.hovered = null
				if (killer === this.hero && (event.bounty > 0 || event.denied)) {
					const text = event.denied ? "!" : `+${String(event.bounty)}`
					this.#popup(unit, event.denied ? "deny" : "gold", text, at, 1)
				}
				const good = unit.team !== this.hero.team
				if (unit.hero) {
					const by = killer?.hero ? `${killer.name} slew` : `${killer?.name ?? "Something"} felled`
					const gold = event.bounty > 0 ? ` (+${String(event.bounty)} g)` : ""
					this.#notice(`${by} the ${teamName(unit.team)} ${unit.name}${gold}`, good, at)
				} else if (unit.stats.structure) {
					this.#notice(`The ${teamName(unit.team)} ${unit.name} has fallen`, good, at)
				}
				return true
			}
			case "victory":
				this.winner = event.team
				return false
		}
	}

	/** Damage or a miss over a blow's target, when the player's hero dealt it or took it. */
	#hitPopup(attacker: Unit, target: Unit, hit: boolean, damage: number, at: number) {
		if (attacker !== this.hero && target !== this.hero) return
		if (!hit) this.#popup(target, "miss", "Miss", at, 0.7)
		else if (damage > 0) {
			this.#popup(target, target === this.hero ? "taken" : "dealt", String(damage), at, 0.7)
		}
	}

	#notice(text: string, good: boolean, at: number) {
		this.notices = [...this.notices, { id: ++this.#noticeId, text, good, at }]
	}

	/** A pop-up `above` tiles over a unit's body. */
	#popup(unit: Unit, kind: Popup["kind"], text: string, at: number, above: number) {
		const [x, y, z] = this.position(unit)
		const popup: Popup = {
			id: ++this.#popupId,
			kind,
			text,
			position: [x, y + bodyHeight(unit.stats) + above, z],
			at
		}
		this.popups = [...this.popups, popup]
	}

	// Input: commands always go to the hero (DESIGN.md §11).

	/**
	 * A right-click: cancels targeting; else attacks (or denies) the unit clicked, or walks to the
	 * tile.
	 */
	rightClick(unit: Unit | null, tile: readonly [number, number] | null) {
		if (this.targeting) {
			this.targeting = null
			return
		}
		const { hero } = this
		if (!hero.alive) return
		if (unit && unit !== hero) {
			this.#command({ type: "attack", target: unit.id })
			const attacks = unit.team !== hero.team || this.world.deniable(hero, unit)
			this.#mark(attacks ? "attack" : "move", unit.col, unit.row, attacks ? unit : null)
		} else if (tile) {
			this.#command({ type: "move", col: tile[0], row: tile[1] })
			this.#mark("move", tile[0], tile[1], null)
		}
	}

	/**
	 * A left-click: picks the target of an ability (an enemy; for a tile ability, an enemy or the
	 * tile) or an attack-move; else selects a unit.
	 */
	leftClick(unit: Unit | null, tile: readonly [number, number] | null) {
		const { hero, targeting } = this
		if (targeting?.kind === "ability") {
			const { ability } = targeting
			if (!hero.alive) return
			if (unit && this.canTarget(ability, unit)) {
				this.#command({ type: "ability", ability: ability.id, target: unit.id })
				this.#mark("attack", unit.col, unit.row, unit)
			} else if (ability.target === "tile" && tile) {
				this.#command({ type: "abilityAt", ability: ability.id, col: tile[0], row: tile[1] })
				this.#mark("attack", tile[0], tile[1], null)
			} else {
				return
			}
			this.targeting = null
			return
		}
		if (targeting?.kind === "attackMove") {
			this.targeting = null
			if (!hero.alive) return
			if (unit && unit.team !== hero.team) {
				this.#command({ type: "attack", target: unit.id })
				this.#mark("attack", unit.col, unit.row, unit)
			} else if (tile) {
				this.#command({ type: "attackMove", col: tile[0], row: tile[1] })
				this.#mark("move", tile[0], tile[1], null)
			}
			return
		}
		if (unit) this.selected = unit
	}

	/** The hero's ability on a key (Q = 0, W = 1, E = 2), if it has one there. */
	ability(slot: number): Ability | null {
		const id = this.hero.hero?.job.abilities[slot]
		return id ? this.world.rules.abilities[id] : null
	}

	/** Whether an ability of the hero's can be aimed at a unit: an enemy it works on. */
	canTarget(ability: Ability, unit: Unit): boolean {
		return (
			ability.target !== "self" &&
			unit.team !== this.hero.team &&
			(!unit.stats.structure || hitsStructures(ability))
		)
	}

	/** Kills by each team's heroes, for the score. */
	kills(team: Team): number {
		return this.world.heroes.reduce((n, u) => n + (u.team === team ? (u.hero?.kills ?? 0) : 0), 0)
	}

	/** What the AI's hero is about, in words; null for any other unit. */
	intentOf(unit: Unit): string | null {
		return unit === this.opponent ? INTENTS[this.ai.intent] : null
	}

	/** Whether the hero can use an ability now (or as soon as its gauge is full). */
	usable(ability: Ability): boolean {
		return this.hero.alive && ability.enabled && this.hero.mp >= ability.mp
	}

	/** An ability key: a self ability is ordered at once; one on an enemy waits for a click. */
	useAbility(slot: number) {
		const ability = this.ability(slot)
		if (!ability || !this.usable(ability)) return
		if (ability.target === "self") {
			this.targeting = null
			this.#command({ type: "ability", ability: ability.id, target: null })
		} else {
			this.targeting = { kind: "ability", ability }
			this.aim = null
		}
	}

	/** A: the next left-click attack-moves. */
	attackMove() {
		if (this.hero.alive) this.targeting = { kind: "attackMove" }
	}

	/** S or H. */
	stop() {
		this.targeting = null
		this.#command({ type: "stop" })
	}

	/** Esc. */
	cancel() {
		this.targeting = null
	}

	/** F1: selects the hero and centres on it. */
	selectHero() {
		this.selected = this.hero
		this.centre()
	}

	#command(command: Command) {
		this.world.command(this.hero.id, command)
	}

	#mark(kind: OrderMark["kind"], col: number, row: number, unit: Unit | null) {
		this.mark = { kind, col, row, unit, at: performance.now() }
	}

	// What the view reads

	/** Where a unit is drawn, in scene coordinates: between tiles while it steps. */
	position(unit: Unit): Vec3 {
		const step = unit.step
		if (!step) return this.toScene(unit.col, unit.row)
		const t = Math.min(1, (step.progress + this.world.walkOf(unit) * this.alpha) / STEP_FULL)
		const [x, , z] = this.toScene(
			unit.col + (step.col - unit.col) * t,
			unit.row + (step.row - unit.row) * t
		)
		const from = this.groundAt(unit.col, unit.row)
		const to = this.groundAt(step.col, step.row)
		return [x, sceneY(this.model, from + (to - from) * t, this.view.verticalScale), z]
	}

	/** A tile position (fractional between tiles) on the ground, in scene coordinates. */
	toScene(col: number, row: number): Vec3 {
		const ground = this.groundAt(Math.round(col), Math.round(row))
		return [
			tileX(this.model, col),
			sceneY(this.model, ground, this.view.verticalScale),
			tileZ(this.model, row)
		]
	}

	/**
	 * Where a unit's feet go on a tile, in game units: the ground, or the water's surface on a
	 * water tile (units wade on top, so their rings and shadows aren't under it); 0 off the map.
	 */
	groundAt(col: number, row: number): number {
		const { model } = this
		if (!model.inside(col, row)) return 0
		const i = model.index(col, row)
		const height = model.height[i]
		if (Number.isNaN(height)) return 0
		return model.water[i] === 1 ? height + WATER_DEPTH : height
	}

	/**
	 * Whether a unit shows a hit flash now: from when a blow lands (at once in melee, when the
	 * projectile arrives otherwise), for a moment.
	 */
	flashing(unit: Unit): boolean {
		const time = this.time
		for (const e of this.effects) {
			if (e.target !== unit || !e.hit) continue
			const lands =
				e.at +
				(e.magic ? 0.05
				: e.attacker.stats.reach <= 2 ? 0.08
				: ATTACK_EFFECT)
			if (time >= lands && time < lands + FLASH) return true
		}
		return false
	}

	/** The ability of a unit's latest attack still showing; null for a plain one or none. */
	lastBlow(unit: Unit): AbilityId | null {
		for (let i = this.effects.length - 1; i >= 0; i--) {
			if (this.effects[i].attacker === unit) return this.effects[i].ability
		}
		return null
	}

	/** Seconds since a unit's latest heal started, or Infinity. */
	healAge(unit: Unit): number {
		for (let i = this.heals.length - 1; i >= 0; i--) {
			if (this.heals[i].unit === unit) return this.time - this.heals[i].at
		}
		return Infinity
	}

	/** Centres the camera on the focus. */
	centre(smooth = true) {
		void this.view.controls?.moveTo(...this.focus, smooth)
	}

	/** Turns the view 90°, FFT style. */
	rotate(direction: 1 | -1) {
		this.view.rotate(direction)
	}

	/** F9: pauses, or resumes at the speed it was paused from. */
	togglePause() {
		if (this.speed === 0) this.speed = this.#resume
		else this.pause()
	}

	pause() {
		if (this.speed !== 0) this.#resume = this.speed
		this.speed = 0
	}

	// Tuning (DESIGN.md §11, milestone 6)

	/** Changes one of the game's numbers from the next tick; false when there's none at `path`. */
	tune(path: string, value: number): boolean {
		if (!this.world.tune(path, value)) return false
		this.retuned++
		return true
	}

	/** The numbers that differ from the content's. */
	changes(): Change[] {
		void this.retuned
		return changes(this.world.rules, this.defaults)
	}

	/** A link to a new game: this one's hero and side unless given others, and its tuned numbers. */
	href(options: { job?: JobId; side?: Team } = {}): string {
		const tune = formatChanges(this.changes())
		const job = options.job ?? this.job
		const side = options.side ?? this.hero.team
		return `?job=${job}&side=${side}${tune ? `&tune=${tune}` : ""}`
	}
}

export const teamName = (team: Team): string => (team === "radiant" ? "Radiant" : "Dire")

export const [getGameState, setGameState] = createContext<GameState>()
