import {
	AgXToneMapping,
	Color,
	DirectionalLight,
	Group,
	HalfFloatType,
	HemisphereLight,
	Matrix4,
	OrthographicCamera,
	PCFShadowMap,
	PMREMGenerator,
	Raycaster,
	Scene,
	Spherical,
	Vector2,
	Vector3,
	WebGLRenderer,
	WebGLRenderTarget,
	type Object3D
} from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { OutputPass } from "three/addons/postprocessing/OutputPass.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js"
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js"
import { on } from "svelte/events"
import type { LayerMode, LayerStyle } from "#lib/map/layers.ts"
import type { MapModel } from "#lib/map/model.ts"
import type { MapEntity } from "#lib/map/schema.ts"
import { sameSelection, type Selection } from "#lib/selection.ts"
import { floorHeight, sceneY, tileX, tileZ } from "./coords.ts"
import { CachedGTAOPass } from "./ao.ts"
import { TileCursor } from "./cursor.ts"
import { Entities } from "./entities.ts"
import { Lanes } from "./lanes.ts"
import { pickColumn } from "./picking.ts"
import { Terrain } from "./terrain.ts"
import { Trees } from "./trees.ts"
import { Water } from "./water.ts"

export interface Visibility {
	trees: boolean
	entities: boolean
	allMarkers: boolean
	lanes: boolean
	labels: boolean
	grid: boolean
	ao: boolean
}

export interface ViewerEvents {
	hover(selection: Selection | null): void
	click(selection: Selection | null): void
}

/** Isometric start: from the south-west (Radiant's corner), looking north-east. */
const HOME_DIRECTION = new Vector3(-1, 1.25, 1).normalize()
const CAMERA_DISTANCE = 1200
/** The smallest half-extents (tiles) of the view at zoom 1: the whole board fits. */
const MIN_HALF_WIDTH = 215
const MIN_HALF_HEIGHT = 150
/** Tile edge lines fade in between these on-screen tile sizes (CSS px). */
const GRID_FADE: [number, number] = [6, 16]
const GRID_OPACITY = 0.38
const CLICK_SLOP = 6
/** Ambient occlusion is soft and low-frequency: computing it at half resolution halves the frame cost. */
const AO_SCALE = 0.5

const smoothstep = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
	return t * t * (3 - 2 * t)
}

/**
 * The three.js side of the viewer: owns the renderer, scene, camera and controls, and reports
 * hover and clicks. The page pushes state in through the setters.
 */
export class Viewer {
	private readonly renderer: WebGLRenderer
	private readonly composer: EffectComposer
	private readonly gtao: CachedGTAOPass
	private readonly labelRenderer = new CSS2DRenderer()
	private readonly scene = new Scene()
	private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 1, 4000)
	private readonly controls: OrbitControls
	private readonly sun = new DirectionalLight(0xfff0d8, 3.4)
	/** Terrain and water: scaled vertically by the height slider. */
	private readonly ground = new Group()
	private readonly terrain: Terrain
	private readonly water: Water
	private readonly trees: Trees
	private readonly entities: Entities
	private readonly lanes: Lanes
	private readonly hoverCursor = new TileCursor(0xffe39a, 0.4)
	private readonly pinCursor = new TileCursor(0x9fe3ff, 0.3)
	private readonly raycaster = new Raycaster()
	private readonly resizer: ResizeObserver
	private readonly unlisten: (() => void)[]

	private verticalScale = 1
	private visibility: Visibility = {
		trees: true,
		entities: true,
		allMarkers: false,
		lanes: true,
		labels: true,
		grid: true,
		ao: true
	}
	private readonly pointer = new Vector2()
	private pointerInside = false
	private pickPending = false
	private downAt: [number, number] | null = null
	private hovered: Selection | null = null
	private pinned: Selection | null = null
	private turn: { from: number; to: number; start: number; duration: number } | null = null
	private frame = 0
	private lastTime = 0
	private halfHeight = MIN_HALF_HEIGHT
	/** Set when shapes in the scene changed: shadows and the AO G-buffer need re-rendering. */
	private sceneChanged = true
	private readonly lastView = new Matrix4()
	private readonly lastProjection = new Matrix4()

	private readonly container: HTMLElement
	private readonly model: MapModel
	private readonly events: ViewerEvents

	constructor(container: HTMLElement, model: MapModel, events: ViewerEvents) {
		this.container = container
		this.model = model
		this.events = events
		const renderer = (this.renderer = new WebGLRenderer({ powerPreference: "high-performance" }))
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
		renderer.shadowMap.enabled = true
		renderer.shadowMap.type = PCFShadowMap
		// The board is static: shadows are re-rendered only when shapes change (see `sceneChanged`).
		renderer.shadowMap.autoUpdate = false
		renderer.toneMapping = AgXToneMapping
		renderer.toneMappingExposure = 1.2
		renderer.domElement.style.display = "block"
		container.append(renderer.domElement)
		this.labelRenderer.domElement.className = "labels"
		container.append(this.labelRenderer.domElement)

		this.scene.background = new Color(0x0b101c)
		const pmrem = new PMREMGenerator(renderer)
		this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
		this.scene.environmentIntensity = 0.22
		pmrem.dispose()
		this.scene.add(new HemisphereLight(0xd6e2ff, 0x3a3222, 0.75))
		this.setUpSun()

		this.terrain = new Terrain(model)
		this.water = new Water(model)
		this.ground.add(this.terrain.mesh, this.water.mesh)
		this.trees = new Trees(model, this.verticalScale)
		this.entities = new Entities(model, this.verticalScale)
		this.lanes = new Lanes(model, this.verticalScale)
		this.scene.add(
			this.ground,
			this.trees.group,
			this.entities.major,
			this.entities.minor,
			this.entities.labels,
			this.lanes.group,
			this.hoverCursor.group,
			this.pinCursor.group
		)
		this.entities.minor.visible = false

		// SMAA rather than MSAA: GTAO's full-screen passes into multisampled buffers cost ~15 ms a
		// frame at retina sizes; SMAA costs ~2 ms and looks the same on flat-shaded geometry.
		this.composer = new EffectComposer(
			renderer,
			new WebGLRenderTarget(1, 1, { type: HalfFloatType })
		)
		this.composer.addPass(new RenderPass(this.scene, this.camera))
		this.gtao = new CachedGTAOPass(this.scene, this.camera, 1, 1)
		this.gtao.updateGtaoMaterial({
			radius: 2.5,
			distanceExponent: 1.5,
			thickness: 4,
			scale: 1.1,
			samples: 16
		})
		this.gtao.blendIntensity = 0.9
		this.composer.addPass(this.gtao)
		this.composer.addPass(new SMAAPass())
		this.composer.addPass(new OutputPass())

		this.controls = new OrbitControls(this.camera, renderer.domElement)
		Object.assign(this.controls, {
			enableDamping: true,
			dampingFactor: 0.12,
			screenSpacePanning: true,
			zoomToCursor: true,
			minZoom: 0.6,
			maxZoom: 45,
			minPolarAngle: 0.15,
			maxPolarAngle: 1.3
		})
		// three's own EventDispatcher, not a DOM listener.
		// eslint-disable-next-line svelte/no-add-event-listener
		this.controls.addEventListener("change", () => (this.pickPending = true))

		const canvas = renderer.domElement
		this.unlisten = [
			on(canvas, "pointermove", this.onPointerMove),
			on(canvas, "pointerdown", this.onPointerDown),
			on(canvas, "pointerup", this.onPointerUp),
			on(canvas, "pointerleave", this.onPointerLeave)
		]

		this.resizer = new ResizeObserver(() => this.resize())
		this.resizer.observe(container)
		this.resize()
		this.home()
		this.frame = requestAnimationFrame(this.loop)
	}

	get treeCount(): number {
		return this.trees.count
	}

	private setUpSun() {
		const sun = this.sun
		// From the west and high: shadows fall east, to the right of things from the home view.
		sun.position.set(-260, 380, 60)
		sun.target.position.set(0, 0, 0)
		sun.castShadow = true
		sun.shadow.mapSize.set(4096, 4096)
		const extent = 240
		Object.assign(sun.shadow.camera, {
			left: -extent,
			right: extent,
			top: extent,
			bottom: -extent,
			near: 50,
			far: 1100
		})
		sun.shadow.camera.updateProjectionMatrix()
		sun.shadow.bias = -0.0004
		sun.shadow.normalBias = 0.06
		sun.shadow.radius = 2.5
		this.scene.add(sun, sun.target)
	}

	setLayer(mode: LayerMode, style: LayerStyle) {
		this.terrain.paint(style)
		// The water surface would tint the data layers; it's only part of the terrain look.
		this.water.mesh.visible = mode === "terrain"
	}

	setVisibility(visibility: Visibility) {
		this.visibility = { ...visibility }
		this.trees.group.visible = visibility.trees
		this.entities.major.visible = visibility.entities
		this.entities.minor.visible = visibility.entities && visibility.allMarkers
		this.lanes.group.visible = visibility.lanes
		this.labelRenderer.domElement.hidden = !(visibility.labels && visibility.entities)
		this.gtao.enabled = visibility.ao
		this.sceneChanged = true
		this.pickPending = true
	}

	setVerticalScale(scale: number) {
		if (scale === this.verticalScale) return
		this.verticalScale = scale
		this.ground.scale.y = scale
		this.trees.setVerticalScale(scale)
		this.entities.setVerticalScale(scale)
		this.lanes.setVerticalScale(scale)
		this.placeCursor(this.hoverCursor, this.hovered)
		this.placeCursor(this.pinCursor, this.pinned)
		this.sceneChanged = true
		this.pickPending = true
	}

	setPinned(selection: Selection | null) {
		this.pinned = selection
		this.placeCursor(this.pinCursor, selection)
	}

	/** Turns the view 90° (FFT-style), snapping to the diagonals. */
	rotate(direction: 1 | -1) {
		const offset = this.camera.position.clone().sub(this.controls.target)
		const spherical = new Spherical().setFromVector3(offset)
		const quarter = Math.PI / 2
		const snapped = Math.round((spherical.theta - Math.PI / 4) / quarter) * quarter + Math.PI / 4
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		this.turn = {
			from: spherical.theta,
			to: snapped + direction * quarter,
			start: performance.now(),
			duration: reduce ? 1 : 420
		}
	}

	home() {
		this.controls.target.set(0, 2, 0)
		this.camera.position
			.copy(HOME_DIRECTION)
			.multiplyScalar(CAMERA_DISTANCE)
			.add(this.controls.target)
		this.camera.zoom = 1
		this.camera.updateProjectionMatrix()
		this.controls.update()
	}

	private resize() {
		const width = Math.max(1, this.container.clientWidth)
		const height = Math.max(1, this.container.clientHeight)
		const aspect = width / height
		const halfWidth = Math.max(MIN_HALF_WIDTH, MIN_HALF_HEIGHT * aspect)
		this.halfHeight = halfWidth / aspect
		Object.assign(this.camera, {
			left: -halfWidth,
			right: halfWidth,
			top: this.halfHeight,
			bottom: -this.halfHeight
		})
		this.camera.updateProjectionMatrix()
		this.renderer.setSize(width, height, false)
		this.renderer.domElement.style.width = `${String(width)}px`
		this.renderer.domElement.style.height = `${String(height)}px`
		this.composer.setSize(width, height)
		const pixels = this.renderer.getPixelRatio() * AO_SCALE
		this.gtao.setSize(Math.round(width * pixels), Math.round(height * pixels))
		this.labelRenderer.setSize(width, height)
		this.sceneChanged = true
		this.lanes.setResolution(width, height)
		this.hoverCursor.setResolution(width, height)
		this.pinCursor.setResolution(width, height)
	}

	private readonly onPointerMove = (event: PointerEvent) => {
		const rect = this.renderer.domElement.getBoundingClientRect()
		this.pointer.set(
			((event.clientX - rect.left) / rect.width) * 2 - 1,
			-((event.clientY - rect.top) / rect.height) * 2 + 1
		)
		this.pointerInside = true
		this.pickPending = true
	}

	private readonly onPointerDown = (event: PointerEvent) => {
		this.downAt = [event.clientX, event.clientY]
	}

	private readonly onPointerUp = (event: PointerEvent) => {
		if (!this.downAt || event.button !== 0) return
		const moved = Math.hypot(event.clientX - this.downAt[0], event.clientY - this.downAt[1])
		this.downAt = null
		if (moved > CLICK_SLOP) return
		this.onPointerMove(event)
		this.events.click(this.pick())
	}

	private readonly onPointerLeave = () => {
		this.pointerInside = false
		this.downAt = null
		this.setHovered(null)
	}

	private setHovered(selection: Selection | null) {
		if (sameSelection(selection, this.hovered)) return
		this.hovered = selection
		this.placeCursor(this.hoverCursor, selection)
		this.events.hover(selection)
	}

	/** What's under the pointer: the nearest entity model, else the tile column the ray meets. */
	private pick(): Selection | null {
		const { model } = this
		this.raycaster.setFromCamera(this.pointer, this.camera)
		const { origin, direction } = this.raycaster.ray
		const toScene = (h: number) => sceneY(model, h, this.verticalScale)
		const hit = pickColumn(
			origin,
			direction,
			model.cols,
			model.rows,
			(col, row) => toScene(model.height[model.index(col, row)]),
			toScene(floorHeight(model)),
			toScene(model.maxHeight) + 0.01
		)
		const targets: Object3D[] = []
		if (this.visibility.entities) {
			targets.push(this.entities.major)
			if (this.visibility.allMarkers) targets.push(this.entities.minor)
		}
		const limit = (hit?.t ?? Infinity) + 0.75
		for (const h of this.raycaster.intersectObjects(targets, true)) {
			if (h.distance > limit) break
			let o: Object3D | null = h.object
			while (o && !o.userData.entity) o = o.parent
			const entity = o?.userData.entity as MapEntity | undefined
			if (entity) {
				const cell = model.cellOf(entity.x, entity.y)
				return { kind: "entity", entity, col: cell?.[0] ?? -1, row: cell?.[1] ?? -1 }
			}
		}
		return hit ? { kind: "tile", col: hit.col, row: hit.row } : null
	}

	private placeCursor(cursor: TileCursor, selection: Selection | null) {
		const { model } = this
		if (!selection || !model.inside(selection.col, selection.row)) return cursor.place(null)
		const h = model.height[model.index(selection.col, selection.row)]
		if (Number.isNaN(h)) return cursor.place(null)
		cursor.place(
			tileX(model, selection.col),
			sceneY(model, h, this.verticalScale),
			tileZ(model, selection.row)
		)
	}

	private readonly loop = (now: number) => {
		this.frame = requestAnimationFrame(this.loop)
		const seconds = now / 1000
		const delta = Math.min(0.1, seconds - this.lastTime)
		this.lastTime = seconds

		if (this.turn) {
			const t = Math.min(1, (now - this.turn.start) / this.turn.duration)
			const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
			const offset = this.camera.position.clone().sub(this.controls.target)
			const spherical = new Spherical().setFromVector3(offset)
			spherical.theta = this.turn.from + (this.turn.to - this.turn.from) * eased
			this.camera.position.copy(this.controls.target).add(offset.setFromSpherical(spherical))
			this.camera.lookAt(this.controls.target)
			if (t >= 1) this.turn = null
		}
		this.controls.update(delta)

		const tilePixels = (this.container.clientHeight / (2 * this.halfHeight)) * this.camera.zoom
		this.terrain.setGridOpacity(
			this.visibility.grid ? GRID_OPACITY * smoothstep(GRID_FADE[0], GRID_FADE[1], tilePixels) : 0
		)
		this.water.animate(seconds)
		this.entities.animate(seconds, delta)

		// Rendering would update this anyway; do it now so this frame sees this frame's camera.
		this.camera.updateMatrixWorld()
		const { matrixWorld, projectionMatrix } = this.camera
		const moved =
			!this.lastView.equals(matrixWorld) || !this.lastProjection.equals(projectionMatrix)
		if (moved) {
			this.lastView.copy(matrixWorld)
			this.lastProjection.copy(projectionMatrix)
		}
		if (moved || this.sceneChanged) this.gtao.refresh = true
		if (this.sceneChanged) this.renderer.shadowMap.needsUpdate = true
		this.sceneChanged = false

		if (this.pickPending && this.pointerInside) {
			this.pickPending = false
			this.setHovered(this.pick())
		}
		this.composer.render(delta)
		this.labelRenderer.render(this.scene, this.camera)
	}

	dispose() {
		cancelAnimationFrame(this.frame)
		this.resizer.disconnect()
		this.controls.dispose()
		for (const stop of this.unlisten) stop()
		this.terrain.dispose()
		this.water.dispose()
		this.trees.dispose()
		this.entities.dispose()
		this.lanes.dispose()
		this.hoverCursor.dispose()
		this.pinCursor.dispose()
		this.gtao.dispose()
		this.composer.dispose()
		this.scene.environment?.dispose()
		this.sun.shadow.dispose()
		this.renderer.dispose()
		this.renderer.domElement.remove()
		this.labelRenderer.domElement.remove()
	}
}
