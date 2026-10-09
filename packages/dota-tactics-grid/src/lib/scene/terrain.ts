import {
	BufferAttribute,
	BufferGeometry,
	Color,
	Mesh,
	MeshStandardMaterial,
	SRGBColorSpace,
	type IUniform
} from "three"
import type { LayerStyle } from "#lib/map/layers.ts"
import type { MapModel } from "#lib/map/model.ts"
import { buildColumns, PART_CLIFF, PART_STEP } from "./columns.ts"
import { floorHeight } from "./coords.ts"

/** Step walls are the top colour, this much darker. */
const STEP_SHADE = 0.8

/**
 * The board: one flat-shaded mesh of tile columns with per-vertex colours, so switching layers
 * only rewrites colours. Tile edge lines are drawn in the shader and fade in as you zoom.
 */
export class Terrain {
	readonly mesh: Mesh<BufferGeometry, MeshStandardMaterial>
	private readonly tile: Uint32Array
	private readonly part: Uint8Array
	private readonly colours: BufferAttribute
	private readonly gridOpacity: IUniform<number> = { value: 0 }

	private readonly model: MapModel

	constructor(model: MapModel) {
		this.model = model
		const columns = buildColumns(
			model,
			(i) => model.height[i],
			(i) => model.height[i],
			floorHeight(model)
		)
		this.tile = columns.tile
		this.part = columns.part
		const geometry = new BufferGeometry()
		geometry.setAttribute("position", new BufferAttribute(columns.positions, 3))
		geometry.setAttribute("normal", new BufferAttribute(columns.normals, 3))
		this.colours = new BufferAttribute(new Float32Array(columns.tile.length * 3), 3)
		geometry.setAttribute("color", this.colours)
		geometry.setIndex(new BufferAttribute(columns.indices, 1))
		geometry.computeBoundingSphere()

		const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 })
		const gridOpacity = this.gridOpacity
		// Tile edges sit at X = col - cols/2 and Z = rows/2 - row: integers unless cols or rows is odd.
		const gridOffset = { value: [(model.cols / 2) % 1, (model.rows / 2) % 1] }
		material.onBeforeCompile = (shader) => {
			shader.uniforms.uGridOpacity = gridOpacity
			shader.uniforms.uGridOffset = gridOffset
			shader.vertexShader = shader.vertexShader
				.replace(
					"#include <common>",
					"#include <common>\nvarying vec3 vGridPos;\nvarying float vGridUp;"
				)
				.replace(
					"#include <begin_vertex>",
					"#include <begin_vertex>\nvGridPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvGridUp = normal.y;"
				)
			shader.fragmentShader = shader.fragmentShader
				.replace(
					"#include <common>",
					"#include <common>\nuniform float uGridOpacity;\nuniform vec2 uGridOffset;\nvarying vec3 vGridPos;\nvarying float vGridUp;"
				)
				.replace(
					"#include <color_fragment>",
					`#include <color_fragment>
					if (uGridOpacity > 0.0 && vGridUp > 0.5) {
						// Distance to the nearest tile edge, in pixels: a 1px anti-aliased line.
						vec2 p = vGridPos.xz + uGridOffset;
						vec2 edge = abs(fract(p + 0.5) - 0.5) / fwidth(p);
						float line = 1.0 - min(min(edge.x, edge.y), 1.0);
						diffuseColor.rgb *= 1.0 - line * uGridOpacity;
					}`
				)
		}
		material.customProgramCacheKey = () => "terrain-grid"

		this.mesh = new Mesh(geometry, material)
		this.mesh.castShadow = true
		this.mesh.receiveShadow = true
		this.mesh.name = "terrain"
	}

	/** Recolours every tile from a layer style. */
	paint(style: LayerStyle) {
		const { count } = this.model
		const tops = new Float32Array(count * 3)
		const cliffs = new Float32Array(count * 3)
		const c = new Color()
		for (let i = 0; i < count; i++) {
			if (!this.model.hasGround(i)) continue
			const { top, cliff } = style.paint(i)
			c.setRGB(top[0], top[1], top[2], SRGBColorSpace)
			tops.set([c.r, c.g, c.b], i * 3)
			c.setRGB(cliff[0], cliff[1], cliff[2], SRGBColorSpace)
			cliffs.set([c.r, c.g, c.b], i * 3)
		}
		const out = this.colours.array as Float32Array
		for (let v = 0; v < this.tile.length; v++) {
			const i = this.tile[v] * 3
			const kind = this.part[v]
			const source = kind === PART_CLIFF ? cliffs : tops
			const k = kind === PART_STEP ? STEP_SHADE : 1
			out[v * 3] = source[i] * k
			out[v * 3 + 1] = source[i + 1] * k
			out[v * 3 + 2] = source[i + 2] * k
		}
		this.colours.needsUpdate = true
	}

	setGridOpacity(opacity: number) {
		this.gridOpacity.value = opacity
	}

	dispose() {
		this.mesh.geometry.dispose()
		this.mesh.material.dispose()
	}
}
