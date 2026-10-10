import { createContext } from "svelte"
import type { MapModel } from "dota-tactics-grid/map/model.ts"
import { sceneX, sceneY, sceneZ } from "dota-tactics-grid/scene/coords.ts"
import type { ViewerState } from "dota-tactics-grid/state.svelte.ts"
import type { Vec3 } from "./camera.ts"
import { pathLength, pointAlong, type Point2 } from "./path.ts"

/** Creep walking speed, game units per second (Dota's). */
const CREEP_SPEED = 325

/**
 * One game: the board's viewer state (which the board's components read), the game clock, and what
 * the camera and input share. The simulation joins it in milestone 2; until then a marker walks
 * Radiant's mid lane at creep speed, round and round, for the camera to follow.
 */
export class GameState {
	readonly model: MapModel
	readonly view: ViewerState
	/** Seconds since the game started. */
	time = 0
	/** The stand-in walker's path, in game units. */
	readonly walkerPath: Point2[]
	readonly walkerLength: number
	/** Where the stand-in walker is, in scene coordinates. */
	walker = $state.raw<Vec3>([0, 0, 0])
	/** What the camera centres on (the player's hero, later), in scene coordinates. */
	focus = $state.raw<Vec3>([0, 0, 0])
	/** Space is held: the camera stays centred on the focus. */
	following = $state(false)

	constructor(view: ViewerState) {
		this.view = view
		this.model = view.model
		const lane = this.model.data.lanes.find((l) => l.team === "radiant" && l.lane === "mid")
		if (!lane) throw new Error("the map has no Radiant mid lane")
		this.walkerPath = lane.points.map(([x, y]): Point2 => [x, y])
		this.walkerLength = pathLength(this.walkerPath)
		this.advance(0)
	}

	/** Moves the game on by `delta` seconds. */
	advance(delta: number) {
		this.time += delta
		const distance = (this.time * CREEP_SPEED) % this.walkerLength
		this.walker = this.toScene(pointAlong(this.walkerPath, distance))
		this.focus = this.walker
	}

	/** A map point (game units) on the ground, in scene coordinates. */
	toScene([x, y]: Point2): Vec3 {
		const { model } = this
		const cell = model.cellOf(x, y)
		const ground = cell ? model.height[model.index(...cell)] : NaN
		return [
			sceneX(model, x),
			sceneY(model, Number.isNaN(ground) ? 0 : ground, this.view.verticalScale),
			sceneZ(model, y)
		]
	}

	/** Centres the camera on the focus. */
	centre(smooth = true) {
		void this.view.controls?.moveTo(...this.focus, smooth)
	}

	/** Turns the view 90°, FFT style. */
	rotate(direction: 1 | -1) {
		this.view.rotate(direction)
	}
}

export const [getGameState, setGameState] = createContext<GameState>()
