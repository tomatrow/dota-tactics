import {
	BufferAttribute,
	BufferGeometry,
	Color,
	ConeGeometry,
	CylinderGeometry,
	DodecahedronGeometry,
	Group,
	IcosahedronGeometry,
	InstancedMesh,
	Matrix4,
	MeshStandardMaterial,
	Quaternion,
	Vector3
} from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import { hash2 } from "#lib/map/hash.ts"
import type { MapModel } from "#lib/map/model.ts"
import { sceneX, sceneY, sceneZ } from "./coords.ts"

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

// Sizes in tiles (64 game units). A tree covers its 2×2 tiles.
const SPECIES = {
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
type Species = keyof typeof SPECIES

interface Placement {
	x: number
	z: number
	ground: number
	yaw: number
	width: number
	height: number
}

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

/** Every tree from the tree map as an instanced low-poly model, styled by side. */
export class Trees {
	readonly group = new Group()
	private readonly meshes: { mesh: InstancedMesh; places: Placement[] }[] = []

	private readonly model: MapModel

	constructor(model: MapModel, verticalScale: number) {
		this.model = model
		this.group.name = "trees"
		const bySpecies = new Map<Species, { places: Placement[]; tints: number[] }>()
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
			const place = {
				x: sceneX(model, x),
				z: sceneZ(model, y),
				ground,
				yaw: hash2(x, y, 9) * Math.PI * 2,
				width: size,
				height: size * (0.9 + hash2(x, y, 13) * 0.3)
			}
			let group = bySpecies.get(species)
			if (!group) bySpecies.set(species, (group = { places: [], tints: [] }))
			group.places.push(place)
			group.tints.push(0.82 + hash2(x, y, 17) * 0.3)
		}

		const material = new MeshStandardMaterial({
			vertexColors: true,
			roughness: 0.85,
			flatShading: true
		})
		const colour = new Color()
		for (const [species, { places, tints }] of bySpecies) {
			const mesh = new InstancedMesh(SPECIES[species](), material, places.length)
			mesh.name = species
			mesh.castShadow = true
			mesh.receiveShadow = true
			tints.forEach((tint, k) => mesh.setColorAt(k, colour.setScalar(tint)))
			this.meshes.push({ mesh, places })
			this.group.add(mesh)
		}
		this.setVerticalScale(verticalScale)
	}

	get count(): number {
		return this.meshes.reduce((n, m) => n + m.places.length, 0)
	}

	/** Trees keep their size; only the ground they stand on moves. */
	setVerticalScale(verticalScale: number) {
		const m = new Matrix4()
		const q = new Quaternion()
		const up = new Vector3(0, 1, 0)
		const p = new Vector3()
		const s = new Vector3()
		for (const { mesh, places } of this.meshes) {
			places.forEach((t, k) => {
				p.set(t.x, sceneY(this.model, t.ground, verticalScale), t.z)
				q.setFromAxisAngle(up, t.yaw)
				s.set(t.width, t.height, t.width)
				mesh.setMatrixAt(k, m.compose(p, q, s))
			})
			mesh.instanceMatrix.needsUpdate = true
			mesh.computeBoundingSphere()
		}
	}

	dispose() {
		for (const { mesh } of this.meshes) mesh.geometry.dispose()
		const material = this.meshes[0]?.mesh.material
		if (material && !Array.isArray(material)) material.dispose()
	}
}
