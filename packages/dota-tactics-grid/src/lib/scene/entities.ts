import { Group, Mesh, type Object3D } from "three"
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js"
import { entityLabel, isMinor, LABELLED_KINDS } from "#lib/map/entities.ts"
import type { MapModel } from "#lib/map/model.ts"
import type { MapEntity } from "#lib/map/schema.ts"
import { sceneX, sceneY, sceneZ } from "./coords.ts"
import { buildEntityModel, Materials } from "./models.ts"

interface Placed {
	entity: MapEntity
	root: Group
	base: number
	labelHeight: number
	label?: CSS2DObject
}

/** Every entity as a model at its origin, plus floating labels for the landmarks. */
export class Entities {
	/** Major entities: buildings, objectives, camps. */
	readonly major = new Group()
	/** Plumbing markers, shown with "All markers". */
	readonly minor = new Group()
	/** CSS labels; a separate group so they can be toggled on their own. */
	readonly labels = new Group()
	private readonly placed: Placed[] = []
	private readonly animated: Object3D[] = []
	private readonly materials = new Materials()

	private readonly model: MapModel

	constructor(model: MapModel, verticalScale: number) {
		this.model = model
		this.major.name = "entities"
		this.minor.name = "minor-markers"
		for (const entity of model.data.entities) {
			const { group, labelHeight, animated } = buildEntityModel(entity, this.materials)
			group.rotation.y = (entity.yaw * Math.PI) / 180
			group.userData.entity = entity
			this.animated.push(...animated)
			const placed: Placed = { entity, root: group, base: this.base(entity), labelHeight }
			if (LABELLED_KINDS.has(entity.kind)) {
				const element = document.createElement("div")
				element.className = `lbl team-${entity.team}`
				element.textContent = entityLabel(entity)
				placed.label = new CSS2DObject(element)
				placed.label.center.set(0.5, 1)
				this.labels.add(placed.label)
			}
			this.placed.push(placed)
			;(isMinor(entity) ? this.minor : this.major).add(group)
		}
		this.setVerticalScale(verticalScale)
	}

	/** Base height in game units. Roshan's pit marker is a trigger volume, so it sits on the ground. */
	private base(entity: MapEntity): number {
		if (entity.kind === "roshan_pit") {
			const cell = this.model.cellOf(entity.x, entity.y)
			const ground = cell ? this.model.height[this.model.index(...cell)] : Number.NaN
			if (!Number.isNaN(ground)) return ground
		}
		return entity.z
	}

	setVerticalScale(verticalScale: number) {
		for (const p of this.placed) {
			const x = sceneX(this.model, p.entity.x)
			const z = sceneZ(this.model, p.entity.y)
			const y = sceneY(this.model, p.base, verticalScale)
			p.root.position.set(x, y, z)
			p.label?.position.set(x, y + p.labelHeight, z)
		}
	}

	animate(seconds: number, delta: number) {
		for (const part of this.animated) {
			const spin = part.userData.spin as number | undefined
			const bob = part.userData.bob as number | undefined
			if (spin) part.rotation.y += spin * delta
			if (bob !== undefined) part.position.y = bob + Math.sin(seconds * 2 + part.id) * 0.15
		}
	}

	dispose() {
		for (const group of [this.major, this.minor]) {
			group.traverse((o) => {
				if (o instanceof Mesh) o.geometry.dispose()
			})
		}
		for (const p of this.placed) p.label?.element.remove()
		this.materials.dispose()
	}
}
