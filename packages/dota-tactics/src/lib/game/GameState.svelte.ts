import { createContext } from "svelte"
import { SvelteSet } from "svelte/reactivity"
import type { MapModel } from "dota-tactics-grid/map/model.ts"
import { sceneY, tileX, tileZ } from "dota-tactics-grid/scene/coords.ts"
import { WATER_DEPTH } from "dota-tactics-grid/scene/water.ts"
import type { Selection } from "dota-tactics-grid/selection.ts"
import type { ViewerState } from "dota-tactics-grid/state.svelte.ts"
import { TUNING } from "#lib/content/tuning.ts"
import { STEP_FULL, TICK_RATE, TICK_SECONDS } from "#lib/sim/constants.ts"
import type { SimEvent } from "#lib/sim/events.ts"
import { mapScenario } from "#lib/sim/scenario.ts"
import type { Unit } from "#lib/sim/unit.ts"
import { World } from "#lib/sim/world.ts"
import type { Vec3 } from "./camera.ts"

/** The longest frame the game catches up on; a longer one (a background tab) is dropped. */
const MAX_FRAME = 0.25

/** How long (game seconds) an attack's effect lasts. */
export const ATTACK_EFFECT = 0.3

/** An attack the view is still showing. */
export interface AttackEffect {
	readonly attacker: Unit
	readonly target: Unit
	readonly hit: boolean
	/** Game time (seconds) it happened. */
	readonly at: number
}

/** The game speeds the clock offers; 0 is paused. */
export const SPEEDS = [0, 1, 2, 4, 8] as const

/**
 * One game: the board's viewer state (which the board's components read), the simulation, and
 * what the view and input share. Each frame `advance` runs the world's fixed ticks for the time
 * that passed; positions between ticks are interpolated.
 */
export class GameState {
	readonly model: MapModel
	readonly view: ViewerState
	readonly world: World
	/** Game seconds per real second; 0 is paused. */
	speed = $state<(typeof SPEEDS)[number]>(1)
	/** The world's tick, mirrored for the HUD: everything that reads it updates each tick. */
	tick = $state(0)
	/** The living units, reassigned when one appears or dies. */
	roster = $state.raw<readonly Unit[]>([])
	/** Destroyed buildings' entity names. */
	readonly fallen = new SvelteSet<string>()
	selected = $state.raw<Unit | null>(null)
	/** What the camera centres on, in scene coordinates. */
	focus = $state.raw<Vec3>([0, 0, 0])
	/** Space is held: the camera stays centred on the focus. */
	following = $state(false)
	/** How far into the next tick the game is, 0–1, for interpolation. */
	alpha = 0
	/** Attacks still being drawn, oldest first. */
	effects: AttackEffect[] = []
	#accumulator = 0

	constructor(view: ViewerState, seed: number) {
		this.view = view
		this.model = view.model
		this.world = new World(mapScenario(this.model), seed)
		this.roster = [...this.world.units]
		// Start looking at the river, halfway between the T1s, where the first waves meet.
		const [a, b] = this.world.units.filter((u) => u.stats.structure)
		this.focus = this.toScene((a.col + b.col) / 2, (a.row + b.row) / 2)
	}

	/** Game seconds, between ticks included. */
	get time(): number {
		return (this.world.tick + this.alpha) / TICK_RATE
	}

	/** Seconds until the next wave. */
	get nextWave(): number {
		const interval = TUNING.waveInterval
		return interval - ((this.tick / TICK_RATE) % interval)
	}

	/** Moves the game on by `delta` real seconds. */
	advance(delta: number) {
		this.#accumulator += Math.min(delta, MAX_FRAME) * this.speed
		let changed = false
		while (this.#accumulator >= TICK_SECONDS) {
			this.#accumulator -= TICK_SECONDS
			for (const event of this.world.step()) changed = this.#handle(event) || changed
			this.tick = this.world.tick
		}
		this.alpha = this.#accumulator / TICK_SECONDS
		if (changed) this.roster = [...this.world.units]
		const horizon = this.time - ATTACK_EFFECT
		while (this.effects.length > 0 && this.effects[0].at < horizon) this.effects.shift()
		if (this.selected) this.focus = this.position(this.selected)
	}

	/** Applies one event to what the view keeps; true when the roster changed. */
	#handle(event: SimEvent): boolean {
		switch (event.type) {
			case "spawn":
				return true
			case "attack":
				this.effects.push({
					attacker: event.attacker,
					target: event.target,
					hit: event.hit,
					at: this.world.tick / TICK_RATE
				})
				return false
			case "death": {
				const { unit } = event
				if (unit.entity) this.fallen.add(unit.entity)
				if (this.selected === unit) this.selected = null
				return true
			}
		}
	}

	/** Where a unit is drawn, in scene coordinates: between tiles while it steps. */
	position(unit: Unit): Vec3 {
		const step = unit.step
		if (!step) return this.toScene(unit.col, unit.row)
		const t = Math.min(1, (step.progress + unit.stats.walk * this.alpha) / STEP_FULL)
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
	 * Selects what a click on the board picked: a building's Sentinel, or the unit nearest the
	 * clicked tile (within 2 tiles, as a unit's body stands over the tiles behind it). Anything
	 * else clears the selection.
	 */
	select(selection: Selection | null) {
		if (!selection) {
			this.selected = null
			return
		}
		if (selection.kind === "entity") {
			this.selected = this.world.units.find((u) => u.entity === selection.entity.name) ?? null
			return
		}
		let best: Unit | null = null
		let bestDistance = 3
		for (const unit of this.world.units) {
			if (unit.stats.structure) continue
			const d = Math.abs(unit.col - selection.col) + Math.abs(unit.row - selection.row)
			if (d < bestDistance) {
				best = unit
				bestDistance = d
			}
		}
		this.selected = best
	}

	/** Centres the camera on the focus. */
	centre(smooth = true) {
		void this.view.controls?.moveTo(...this.focus, smooth)
	}

	/** Turns the view 90°, FFT style. */
	rotate(direction: 1 | -1) {
		this.view.rotate(direction)
	}

	/** Pauses, or resumes at 1×. */
	togglePause() {
		this.speed = this.speed === 0 ? 1 : 0
	}
}

export const [getGameState, setGameState] = createContext<GameState>()
