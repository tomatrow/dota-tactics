import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from "three"
import { Line2 } from "three/addons/lines/Line2.js"
import { LineGeometry } from "three/addons/lines/LineGeometry.js"
import { LineMaterial } from "three/addons/lines/LineMaterial.js"

/** The FFT-style tile cursor: a thick outline and a translucent fill on top of a tile. */
export class TileCursor {
	readonly group = new Group()
	private readonly outline: Line2
	private readonly fill: Mesh<PlaneGeometry, MeshBasicMaterial>

	constructor(colour: number, opacity: number) {
		const geometry = new LineGeometry()
		geometry.setPositions([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 0, -0.5])
		this.outline = new Line2(
			geometry,
			new LineMaterial({ color: colour, linewidth: 2.5, depthTest: false, transparent: true })
		)
		this.outline.renderOrder = 10
		this.fill = new Mesh(
			new PlaneGeometry(1, 1),
			new MeshBasicMaterial({
				color: colour,
				transparent: true,
				opacity,
				depthWrite: false,
				toneMapped: false
			})
		)
		this.fill.rotation.x = -Math.PI / 2
		this.fill.position.y = 0.01
		this.fill.renderOrder = 9
		// The cursor is for looking at, not for picking.
		this.fill.raycast = () => undefined
		this.group.add(this.fill, this.outline)
		this.group.visible = false
		this.group.name = "cursor"
	}

	place(x: number | null, y = 0, z = 0) {
		this.group.visible = x !== null
		if (x !== null) this.group.position.set(x, y + 0.02, z)
	}

	setResolution(width: number, height: number) {
		this.outline.material.resolution.set(width, height)
	}

	dispose() {
		this.outline.geometry.dispose()
		this.outline.material.dispose()
		this.fill.geometry.dispose()
		this.fill.material.dispose()
	}
}
