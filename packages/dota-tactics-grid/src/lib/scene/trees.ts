import {
	BufferAttribute,
	BufferGeometry,
	Color,
	ConeGeometry,
	CylinderGeometry,
	DodecahedronGeometry,
	IcosahedronGeometry
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import { hash2 } from "#lib/map/hash.ts"
import type { MapModel } from "#lib/map/model.ts"
import { sceneX, sceneZ } from "./coords.ts"

/** A primitive, flat-shaded, with one vertex colour, moved into place. */
function part(
	geometry: BufferGeometry,
	colour: number,
	[x, y, z]: [number, number, number],
	tilt: [number, number] = [0, 0]
): BufferGeometry {
	// Polyhedra are already non-indexed; everything else is split so faces shade flat.
	const g = geometry.index ? geometry.toNonIndexed() : geometry.clone()
	g.deleteAttribute("uv")
	g.rotateX(tilt[0])
	g.rotateZ(tilt[1])
	g.translate(x, y, z)
	g.computeVertexNormals()
	const c = new Color(colour)
	const colours = new Float32Array(g.attributes.position.count * 3)
	for (let i = 0; i < colours.length; i += 3) colours.set([c.r, c.g, c.b], i)
	g.setAttribute("color", new BufferAttribute(colours, 3))
	geometry.dispose()
	return g
}

function merge(parts: BufferGeometry[]): BufferGeometry {
	const merged = mergeGeometries(parts)
	for (const p of parts) p.dispose()
	return merged
}

/** Each species' model, merged into one flat-shaded geometry with vertex colours. Sizes in tiles (64 game units): a tree covers its 2×2 tiles. */
export const SPECIES = {
	radiantPine: () =>
		merge([
			part(new CylinderGeometry(0.14, 0.2, 0.9, 6), 0x5a4030, [0, 0.45, 0]),
			part(new ConeGeometry(1.05, 1.5, 7), 0x2c5a2b, [0, 1.6, 0]),
			part(new ConeGeometry(0.85, 1.3, 7), 0x35692f, [0, 2.35, 0]),
			part(new ConeGeometry(0.58, 1.1, 7), 0x447a38, [0, 3.0, 0])
		]),
	radiantOak: () =>
		merge([
			part(new CylinderGeometry(0.16, 0.24, 1.3, 6), 0x5f4532, [0, 0.65, 0]),
			part(new IcosahedronGeometry(0.95, 0), 0x4c8a3a, [0, 1.95, 0]),
			part(new IcosahedronGeometry(0.72, 0), 0x5a9a44, [0.55, 1.6, 0.3]),
			part(new IcosahedronGeometry(0.66, 0), 0x427d35, [-0.5, 1.7, -0.32]),
			part(new IcosahedronGeometry(0.58, 0), 0x63a44c, [0.1, 2.5, -0.1])
		]),
	direPine: () =>
		merge([
			part(new CylinderGeometry(0.13, 0.19, 1.0, 5), 0x352621, [0, 0.5, 0]),
			part(new ConeGeometry(0.95, 1.4, 6), 0x3f3133, [0, 1.6, 0]),
			part(new ConeGeometry(0.74, 1.25, 6), 0x4d3434, [0, 2.3, 0]),
			part(new ConeGeometry(0.5, 1.05, 6), 0x5e3a33, [0, 2.95, 0])
		]),
	direGnarled: () =>
		merge([
			part(new CylinderGeometry(0.12, 0.24, 1.6, 5), 0x2f2420, [0, 0.8, 0]),
			part(new CylinderGeometry(0.05, 0.09, 1.1, 4), 0x2f2420, [0.35, 1.75, 0], [0, -0.7]),
			part(new CylinderGeometry(0.05, 0.09, 1.0, 4), 0x2f2420, [-0.3, 1.7, 0.15], [0.3, 0.75]),
			part(new DodecahedronGeometry(0.62, 0), 0x6b2e2c, [0.65, 2.25, 0]),
			part(new DodecahedronGeometry(0.55, 0), 0x7a3d2b, [-0.6, 2.15, 0.25]),
			part(new DodecahedronGeometry(0.7, 0), 0x56302e, [0, 2.6, -0.1])
		])
}
export type Species = keyof typeof SPECIES

/** Ground under a tree on a tile corner: the median of the four tiles around it. */
export function treeGround(model: MapModel, x: number, y: number): number {
	const col = Math.round((x - model.originX) / model.cell)
	const row = Math.round((y - model.originY) / model.cell)
	const heights: number[] = []
	for (const [c, r] of [
		[col - 1, row - 1],
		[col, row - 1],
		[col - 1, row],
		[col, row]
	]) {
		if (model.inside(c, r) && model.hasGround(model.index(c, r))) {
			heights.push(model.height[model.index(c, r)])
		}
	}
	if (!heights.length) return Number.NaN
	heights.sort((a, b) => a - b)
	const mid = heights.length >> 1
	return heights.length % 2 ? heights[mid] : (heights[mid - 1] + heights[mid]) / 2
}

/** One tree: its species, where it stands (scene X/Z, ground in game units) and its look. */
export interface TreePlacement {
	species: Species
	x: number
	z: number
	/** The ground under it, in game units. */
	ground: number
	yaw: number
	width: number
	height: number
	/** A brightness to multiply its colours by. */
	tint: number
}

/**
 * Every tree from the tree map that stands on ground, styled by side: green pines and oaks for
 * Radiant, dead or autumn trees for Dire. Size, turn and tint come from a hash of the position, so
 * every load looks the same.
 */
export function placeTrees(model: MapModel): TreePlacement[] {
	const trees: TreePlacement[] = []
	for (const [x, y] of model.data.trees) {
		const ground = treeGround(model, x, y)
		if (Number.isNaN(ground)) continue
		const dire = hash2(x, y, 3) < model.sideAt(x, y)
		const broad = hash2(x, y, 5) < 0.45
		const species: Species =
			dire ?
				broad ? "direGnarled"
				:	"direPine"
			: broad ? "radiantOak"
			: "radiantPine"
		const size = 0.85 + hash2(x, y, 7) * 0.3
		trees.push({
			species,
			x: sceneX(model, x),
			z: sceneZ(model, y),
			ground,
			yaw: hash2(x, y, 9) * Math.PI * 2,
			width: size,
			height: size * (0.9 + hash2(x, y, 13) * 0.3),
			tint: 0.82 + hash2(x, y, 17) * 0.3
		})
	}
	return trees
}
