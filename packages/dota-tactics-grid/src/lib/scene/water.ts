import {
	BufferAttribute,
	BufferGeometry,
	DataTexture,
	LinearFilter,
	LinearMipmapLinearFilter,
	NoColorSpace,
	RepeatWrapping,
	RGBAFormat
} from "three"
import type { MapModel } from "#lib/map/model.ts"
import { buildColumns } from "./columns.ts"
import { floorHeight } from "./coords.ts"

/**
 * The map data says which tiles are water but not where the surface is, so each water tile gets
 * its own surface this far (game units) above its bed. Steps between surfaces become waterfalls.
 */
export const WATER_DEPTH = 20
/** Normal-map tiles per world tile. */
const RIPPLE_SCALE = 1 / 6

/** A tileable ripple normal map from a sum of integer-frequency sine waves. */
export function rippleTexture(size = 128): DataTexture {
	const waves = [
		[1, 2, 0.9, 0.3],
		[3, -1, 0.5, 1.7],
		[-2, 3, 0.4, 4.1],
		[5, 4, 0.18, 2.2],
		[-6, 5, 0.12, 0.7]
	]
	const data = new Uint8Array(size * size * 4)
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			let dx = 0
			let dy = 0
			for (const [fx, fy, amp, phase] of waves) {
				const a = 2 * Math.PI * ((fx * x) / size + (fy * y) / size) + phase
				dx += amp * fx * Math.cos(a)
				dy += amp * fy * Math.cos(a)
			}
			const k = 0.08
			const nx = -dx * k
			const ny = -dy * k
			const len = Math.hypot(nx, ny, 1)
			const o = (y * size + x) * 4
			data[o] = ((nx / len) * 0.5 + 0.5) * 255
			data[o + 1] = ((ny / len) * 0.5 + 0.5) * 255
			data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255
			data[o + 3] = 255
		}
	}
	const texture = new DataTexture(data, size, size, RGBAFormat)
	texture.wrapS = texture.wrapT = RepeatWrapping
	texture.magFilter = LinearFilter
	texture.minFilter = LinearMipmapLinearFilter
	texture.generateMipmaps = true
	texture.colorSpace = NoColorSpace
	texture.repeat.set(RIPPLE_SCALE, RIPPLE_SCALE)
	texture.needsUpdate = true
	return texture
}

/** The water surfaces: a column top per water tile, with walls where surfaces step down. */
export function waterGeometry(model: MapModel): BufferGeometry {
	const surface = (i: number) => (model.water[i] ? model.height[i] + WATER_DEPTH : Number.NaN)
	const columns = buildColumns(
		model,
		surface,
		(i) => (model.water[i] ? surface(i) : model.height[i]),
		floorHeight(model)
	)
	const geometry = new BufferGeometry()
	geometry.setAttribute("position", new BufferAttribute(columns.positions, 3))
	geometry.setAttribute("normal", new BufferAttribute(columns.normals, 3))
	geometry.setAttribute("uv", new BufferAttribute(columns.uvs, 2))
	geometry.setIndex(new BufferAttribute(columns.indices, 1))
	geometry.computeBoundingSphere()
	return geometry
}
