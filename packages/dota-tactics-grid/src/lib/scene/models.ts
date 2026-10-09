import {
	BoxGeometry,
	CircleGeometry,
	ConeGeometry,
	CylinderGeometry,
	DodecahedronGeometry,
	DoubleSide,
	FrontSide,
	Group,
	IcosahedronGeometry,
	Mesh,
	MeshStandardMaterial,
	OctahedronGeometry,
	SphereGeometry,
	TorusGeometry,
	type BufferGeometry,
	type Object3D
} from "three"
import type { MapEntity, Team } from "#lib/map/schema.ts"

export const TEAM_COLOURS: Record<Team, number> = {
	radiant: 0x74d48e,
	dire: 0xe3624f,
	neutral: 0xe8c35f,
	none: 0xe8c35f
}
const STONE: Record<Team, number> = {
	radiant: 0xd6ccb0,
	dire: 0x5b4847,
	neutral: 0x9a9384,
	none: 0x9a9384
}
const WOOD = 0x7d5c40
const DARK = 0x33302e
const GOLD = 0xe8c35f
const WATER = 0x5fb6e8
const ROSHAN = 0x7a4fa8

interface Look {
	colour: number
	glow?: boolean
	roughness?: number
	metalness?: number
	opacity?: number
}

/** Shared flat-shaded materials, one per look. */
export class Materials {
	private readonly cache = new Map<string, MeshStandardMaterial>()

	get(look: Look): MeshStandardMaterial {
		const key = JSON.stringify(look)
		let material = this.cache.get(key)
		if (!material) {
			material = new MeshStandardMaterial({
				color: look.colour,
				emissive: look.glow ? look.colour : 0x000000,
				emissiveIntensity: look.glow ? 0.65 : 0,
				roughness: look.roughness ?? 0.78,
				metalness: look.metalness ?? 0,
				flatShading: true,
				transparent: look.opacity !== undefined,
				opacity: look.opacity ?? 1,
				side: look.opacity !== undefined ? DoubleSide : FrontSide,
				depthWrite: look.opacity === undefined
			})
			this.cache.set(key, material)
		}
		return material
	}

	dispose() {
		for (const m of this.cache.values()) m.dispose()
		this.cache.clear()
	}
}

export interface EntityModel {
	group: Group
	/** Where a label sits above the model's base, in tiles. */
	labelHeight: number
	/** Parts with `userData.spin` (radians/second) or `userData.bob` (base y). */
	animated: Object3D[]
}

type V3 = [number, number, number]

interface PartOptions {
	at?: V3
	rotate?: V3
	scale?: V3
	spin?: number
	bob?: boolean
	shadow?: boolean
}

/**
 * Builds a low-poly model for an entity, sized in tiles (64 game units) to roughly its in-game
 * footprint. Models face +X at yaw 0; the caller places and rotates them.
 */
export function buildEntityModel(e: MapEntity, materials: Materials): EntityModel {
	const group = new Group()
	const animated: Object3D[] = []
	const team = TEAM_COLOURS[e.team]
	const stone = STONE[e.team]

	const add = (geometry: BufferGeometry, look: Look | number, o: PartOptions = {}) => {
		const mesh = new Mesh(
			geometry,
			materials.get(typeof look === "number" ? { colour: look } : look)
		)
		if (o.at) mesh.position.set(...o.at)
		if (o.rotate) mesh.rotation.set(...o.rotate)
		if (o.scale) mesh.scale.set(...o.scale)
		mesh.castShadow = o.shadow ?? true
		mesh.receiveShadow = true
		// Translucent areas (Roshan's pit, portals) shouldn't capture the pointer from the tiles below.
		if (typeof look !== "number" && look.opacity !== undefined) mesh.raycast = () => undefined
		if (o.spin) {
			mesh.userData.spin = o.spin
			animated.push(mesh)
		}
		if (o.bob) {
			mesh.userData.bob = mesh.position.y
			animated.push(mesh)
		}
		group.add(mesh)
		return mesh
	}
	const flatRing = (radius: number, tube: number, look: Look, y = 0.06) =>
		add(new TorusGeometry(radius, tube, 4, 48), look, {
			at: [0, y, 0],
			rotate: [Math.PI / 2, 0, 0],
			shadow: false
		})

	let labelHeight = 3
	switch (e.kind) {
		case "tower": {
			const f = 0.85 + 0.1 * (e.tier ?? 1)
			const body = 3.2 * f
			add(new CylinderGeometry(1.25, 1.45, 0.45, 6), stone, { at: [0, 0.225, 0] })
			add(new CylinderGeometry(0.7, 0.95, body, 6), stone, { at: [0, 0.45 + body / 2, 0] })
			add(new CylinderGeometry(1.0, 1.0, 0.25, 6), team, { at: [0, 0.45 + body, 0] })
			add(new ConeGeometry(0.9, 1.1, 6), { colour: team, glow: true }, { at: [0, 1.15 + body, 0] })
			add(
				new OctahedronGeometry(0.32),
				{ colour: team, glow: true },
				{ at: [0, 2.2 + body, 0], spin: 1.2, bob: true }
			)
			labelHeight = 3 + body
			break
		}
		case "barracks":
			if (e.type === "range") {
				add(new BoxGeometry(2.6, 1.2, 2.6), stone, { at: [0, 0.6, 0] })
				add(new ConeGeometry(1.9, 2.2, 4), team, { at: [0, 2.3, 0], rotate: [0, Math.PI / 4, 0] })
				add(new OctahedronGeometry(0.3), { colour: team, glow: true }, { at: [0, 3.7, 0], spin: 1 })
			} else {
				add(new BoxGeometry(3.2, 1.4, 3.2), stone, { at: [0, 0.7, 0] })
				add(new ConeGeometry(2.5, 1.5, 4), team, { at: [0, 2.15, 0], rotate: [0, Math.PI / 4, 0] })
			}
			labelHeight = 4
			break
		case "ancient":
			add(new CylinderGeometry(4.2, 4.8, 0.8, 8), stone, { at: [0, 0.4, 0] })
			add(new CylinderGeometry(3.0, 3.5, 0.6, 8), stone, { at: [0, 1.1, 0] })
			add(
				new OctahedronGeometry(1.8),
				{ colour: team, glow: true, metalness: 0.2, roughness: 0.4 },
				{
					at: [0, 4.4, 0],
					scale: [1, 1.8, 1],
					spin: 0.5
				}
			)
			add(
				new TorusGeometry(2.7, 0.14, 6, 40),
				{ colour: team, glow: true },
				{
					at: [0, 3.0, 0],
					rotate: [Math.PI / 2.4, 0, 0],
					spin: -0.3
				}
			)
			labelHeight = 8.5
			break
		case "fountain":
			add(new CylinderGeometry(3.6, 4.0, 0.8, 12), stone, { at: [0, 0.4, 0] })
			add(
				new CylinderGeometry(3.1, 3.1, 0.12, 24),
				{ colour: WATER, glow: true, roughness: 0.2 },
				{
					at: [0, 0.82, 0]
				}
			)
			add(new CylinderGeometry(0.3, 0.55, 3.2, 6), stone, { at: [0, 2.4, 0] })
			add(
				new OctahedronGeometry(0.6),
				{ colour: team, glow: true },
				{ at: [0, 4.6, 0], spin: 0.8, bob: true }
			)
			labelHeight = 6
			break
		case "shop": {
			const roof =
				e.shop === "secret" ? 0xb27ae8
				: e.shop === "side" ? 0x5fc6e8
				: GOLD
			add(new BoxGeometry(2, 1.3, 2), WOOD, { at: [0, 0.65, 0] })
			add(new ConeGeometry(1.7, 1.1, 4), roof, { at: [0, 1.85, 0], rotate: [0, Math.PI / 4, 0] })
			break
		}
		case "outpost":
			add(new CylinderGeometry(1.6, 1.9, 0.6, 8), stone, { at: [0, 0.3, 0] })
			add(new CylinderGeometry(0.45, 0.65, 3.6, 6), stone, { at: [0, 2.4, 0] })
			add(new BoxGeometry(1.4, 0.8, 0.06), GOLD, { at: [0.75, 3.7, 0] })
			add(new OctahedronGeometry(0.35), { colour: GOLD, glow: true }, { at: [0, 4.6, 0], spin: 1 })
			labelHeight = 6
			break
		case "watcher":
			add(new CylinderGeometry(0.12, 0.16, 1.8, 5), DARK, { at: [0, 0.9, 0] })
			add(
				new OctahedronGeometry(0.32),
				{ colour: 0xffd27a, glow: true },
				{ at: [0, 2.05, 0], spin: 1.5 }
			)
			labelHeight = 3
			break
		case "wisdom_shrine":
			add(new CylinderGeometry(1.5, 1.7, 0.3, 10), STONE.neutral, { at: [0, 0.15, 0] })
			for (let k = 0; k < 4; k++) {
				const a = (k / 4) * Math.PI * 2 + Math.PI / 4
				add(new BoxGeometry(0.35, 1.4, 0.35), STONE.neutral, {
					at: [Math.cos(a) * 1.15, 1, Math.sin(a) * 1.15]
				})
			}
			add(
				new OctahedronGeometry(0.5),
				{ colour: 0x7ad7ff, glow: true },
				{ at: [0, 2.1, 0], spin: 1, bob: true }
			)
			break
		case "twin_gate":
			add(new BoxGeometry(1.4, 0.3, 4.2), STONE.neutral, { at: [0, 0.15, 0] })
			add(
				new TorusGeometry(1.75, 0.28, 8, 24, Math.PI),
				{ colour: 0x9b5cff, glow: true },
				{
					at: [0, 0.3, 0],
					rotate: [0, Math.PI / 2, 0]
				}
			)
			add(
				new CircleGeometry(1.45, 24, 0, Math.PI),
				{ colour: 0x9b5cff, glow: true, opacity: 0.45 },
				{
					at: [0, 0.3, 0],
					rotate: [0, Math.PI / 2, 0],
					shadow: false
				}
			)
			break
		case "lotus_pool":
			add(
				new CylinderGeometry(1.5, 1.6, 0.2, 12),
				{ colour: WATER, glow: true, roughness: 0.2 },
				{ at: [0, 0.1, 0] }
			)
			add(new OctahedronGeometry(0.55), 0xf2a0c8, { at: [0, 0.45, 0], scale: [1, 0.5, 1] })
			add(new SphereGeometry(0.18, 8, 6), { colour: GOLD, glow: true }, { at: [0, 0.6, 0] })
			break
		case "neutral_camp": {
			const s = { small: 0.7, medium: 0.9, large: 1.1, ancient: 1.35 }[e.size ?? ""] ?? 0.9
			const banner = e.size === "ancient" ? 0xa0422a : 0xc9a46a
			add(new ConeGeometry(0.7 * s, 0.9 * s, 5), WOOD, { at: [0, 0.45 * s, 0] })
			add(new CylinderGeometry(0.04, 0.04, 1.6 * s, 4), DARK, { at: [0.7 * s, 0.8 * s, 0] })
			add(new BoxGeometry(0.55 * s, 0.35 * s, 0.04), banner, { at: [0.98 * s, 1.4 * s, 0] })
			flatRing(1.1 * s, 0.05, { colour: 0x8a6a4a })
			labelHeight = 2
			break
		}
		case "rune_power":
		case "rune_bounty": {
			const colour = e.kind === "rune_power" ? 0x5fe0e8 : 0xf2c14e
			add(
				new IcosahedronGeometry(0.42, 1),
				{ colour, glow: true, roughness: 0.3 },
				{ at: [0, 1.4, 0], bob: true }
			)
			flatRing(0.75, 0.06, { colour, glow: true })
			break
		}
		case "roshan":
			add(new DodecahedronGeometry(1.1), 0x4a2d63, { at: [0, 1.0, 0], scale: [1.4, 0.9, 1.1] })
			add(new DodecahedronGeometry(0.6), 0x4a2d63, { at: [1.3, 1.35, 0] })
			add(new ConeGeometry(0.16, 0.7, 5), 0xe8dcc0, {
				at: [1.45, 2.0, 0.3],
				rotate: [0.4, 0, -0.5]
			})
			add(new ConeGeometry(0.16, 0.7, 5), 0xe8dcc0, {
				at: [1.45, 2.0, -0.3],
				rotate: [-0.4, 0, -0.5]
			})
			add(
				new SphereGeometry(0.08, 6, 4),
				{ colour: 0xff8a3c, glow: true },
				{ at: [1.85, 1.45, 0.2] }
			)
			add(
				new SphereGeometry(0.08, 6, 4),
				{ colour: 0xff8a3c, glow: true },
				{ at: [1.85, 1.45, -0.2] }
			)
			labelHeight = 3.5
			break
		case "roshan_pit":
			flatRing(5.5, 0.18, { colour: ROSHAN, glow: true }, 0.12)
			add(
				new CircleGeometry(5.5, 48),
				{ colour: ROSHAN, opacity: 0.16 },
				{
					at: [0, 0.08, 0],
					rotate: [-Math.PI / 2, 0, 0],
					shadow: false
				}
			)
			break
		case "tormentor":
			add(
				new IcosahedronGeometry(1.1, 0),
				{ colour: team, glow: true, metalness: 0.3, roughness: 0.35 },
				{
					at: [0, 2.6, 0],
					spin: 0.7,
					bob: true
				}
			)
			flatRing(1.7, 0.1, { colour: team, glow: true })
			labelHeight = 5
			break
		case "filler":
		case "building":
			add(new BoxGeometry(1.1, 0.5, 1.1), stone, { at: [0, 0.25, 0] })
			add(new ConeGeometry(0.5, 1.8, 4), stone, { at: [0, 1.4, 0], rotate: [0, Math.PI / 4, 0] })
			add(new OctahedronGeometry(0.2), { colour: team, glow: true }, { at: [0, 2.5, 0], spin: 1 })
			break
		case "lane_spawner":
			add(new CylinderGeometry(0.07, 0.07, 2.2, 4), DARK, { at: [0, 1.1, 0] })
			add(new BoxGeometry(0.9, 0.6, 0.05), team, { at: [0.48, 1.85, 0] })
			break
		case "neutral_stash":
			add(new BoxGeometry(0.9, 0.55, 0.6), WOOD, { at: [0, 0.28, 0] })
			add(new BoxGeometry(0.95, 0.15, 0.65), GOLD, { at: [0, 0.62, 0] })
			break
		default:
			// Unknown kinds: a pin.
			add(
				new ConeGeometry(0.3, 1.0, 6),
				{ colour: team },
				{ at: [0, 0.5, 0], rotate: [Math.PI, 0, 0] }
			)
			add(new SphereGeometry(0.3, 10, 8), { colour: team, glow: true }, { at: [0, 1.15, 0] })
	}
	return { group, labelHeight, animated }
}
