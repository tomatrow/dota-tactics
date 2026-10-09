import { Group } from "three"
import { Line2 } from "three/addons/lines/Line2.js"
import { LineGeometry } from "three/addons/lines/LineGeometry.js"
import { LineMaterial } from "three/addons/lines/LineMaterial.js"
import type { MapModel } from "#lib/map/model.ts"
import type { MapLane } from "#lib/map/schema.ts"
import { sceneX, sceneY, sceneZ } from "./coords.ts"
import { TEAM_COLOURS } from "./models.ts"

/** Each team's path keeps to its own right (tiles), so both directions of a lane show. */
const KEEP_RIGHT = 0.35
/** Height above the ground (tiles). */
const LIFT = 0.12
/** Sample spacing along a path (game units). */
const STEP = 24

/**
 * Lane paths as screen-width lines that follow the ground, sampled along each path so they step
 * up and down with the tiles under them.
 */
export function laneSamples(model: MapModel, lane: MapLane, verticalScale: number): number[] {
	const out: number[] = []
	const { points } = lane
	for (let s = 0; s + 1 < points.length; s++) {
		const [ax, ay, az] = points[s]
		const [bx, by] = points[s + 1]
		const length = Math.hypot(bx - ax, by - ay)
		// Right of travel in game space (x east, y north) is (dy, -dx).
		const rx = length ? (by - ay) / length : 0
		const ry = length ? -(bx - ax) / length : 0
		const n = Math.max(1, Math.ceil(length / STEP))
		for (let k = s === 0 ? 0 : 1; k <= n; k++) {
			const t = k / n
			const x = ax + (bx - ax) * t + rx * KEEP_RIGHT * model.cell
			const y = ay + (by - ay) * t + ry * KEEP_RIGHT * model.cell
			const cell = model.cellOf(x, y)
			const ground = cell ? model.height[model.index(...cell)] : Number.NaN
			out.push(
				sceneX(model, x),
				sceneY(model, Number.isNaN(ground) ? az : ground, verticalScale) + LIFT,
				sceneZ(model, y)
			)
		}
	}
	return out
}

export class Lanes {
	readonly group = new Group()
	private readonly lines: { lane: MapLane; line: Line2 }[] = []

	private readonly model: MapModel

	constructor(model: MapModel, verticalScale: number) {
		this.model = model
		this.group.name = "lanes"
		for (const lane of model.data.lanes) {
			const material = new LineMaterial({
				color: TEAM_COLOURS[lane.team],
				linewidth: 3,
				transparent: true,
				opacity: 0.9,
				worldUnits: false
			})
			const line = new Line2(new LineGeometry(), material)
			line.name = `${lane.team}-${lane.lane}`
			this.lines.push({ lane, line })
			this.group.add(line)
		}
		this.setVerticalScale(verticalScale)
	}

	setVerticalScale(verticalScale: number) {
		for (const { lane, line } of this.lines) {
			line.geometry.dispose()
			const geometry = new LineGeometry()
			geometry.setPositions(laneSamples(this.model, lane, verticalScale))
			line.geometry = geometry
			line.computeLineDistances()
		}
	}

	setResolution(width: number, height: number) {
		for (const { line } of this.lines) line.material.resolution.set(width, height)
	}

	dispose() {
		for (const { line } of this.lines) {
			line.geometry.dispose()
			line.material.dispose()
		}
	}
}
