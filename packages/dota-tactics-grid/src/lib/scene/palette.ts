import { createContext } from "svelte"
import { DoubleSide, FrontSide, MeshStandardMaterial } from "three"
import type { MapEntity, Team } from "#lib/map/schema.ts"

export const TEAM_COLOURS: Record<Team, number> = {
	radiant: 0x74d48e,
	dire: 0xe3624f,
	neutral: 0xe8c35f,
	none: 0xe8c35f
}
export const STONE: Record<Team, number> = {
	radiant: 0xd6ccb0,
	dire: 0x5b4847,
	neutral: 0x9a9384,
	none: 0x9a9384
}
export const WOOD = 0x7d5c40
export const DARK = 0x33302e
export const GOLD = 0xe8c35f
export const WATER = 0x5fb6e8
export const ROSHAN = 0x7a4fa8

/** How a model part looks: a colour, or a colour with extras. */
export type Look =
	| number
	| {
			colour: number
			glow?: boolean
			roughness?: number
			metalness?: number
			/** Translucent parts are see-through areas, and don't catch the pointer. */
			opacity?: number
	  }

/** Shared flat-shaded materials, one per look. */
export class Materials {
	private readonly cache = new Map<string, MeshStandardMaterial>()

	get(look: Look): MeshStandardMaterial {
		const l = typeof look === "number" ? { colour: look } : look
		const key = JSON.stringify(l)
		let material = this.cache.get(key)
		if (!material) {
			material = new MeshStandardMaterial({
				color: l.colour,
				emissive: l.glow ? l.colour : 0x000000,
				emissiveIntensity: l.glow ? 0.65 : 0,
				roughness: l.roughness ?? 0.78,
				metalness: l.metalness ?? 0,
				flatShading: true,
				transparent: l.opacity !== undefined,
				opacity: l.opacity ?? 1,
				side: l.opacity !== undefined ? DoubleSide : FrontSide,
				depthWrite: l.opacity === undefined
			})
			this.cache.set(key, material)
		}
		return material
	}
}

/** The entity models' shared materials. */
export const [getMaterials, setMaterials] = createContext<Materials>()

/** Where a landmark's label floats above its model's base, in tiles. */
export function labelHeight(e: MapEntity): number {
	switch (e.kind) {
		case "ancient":
			return 8.5
		case "fountain":
		case "outpost":
			return 6
		case "tormentor":
			return 5
		case "roshan":
			return 3.5
		default:
			return 3
	}
}
