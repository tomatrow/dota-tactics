import { gnvFlagNames, RAMP_RANGE, type MapModel } from "./model.ts"
import { hash2 } from "./hash.ts"

/** An sRGB colour, components 0–1. */
export type RGB = [r: number, g: number, b: number]

export type LayerMode =
	"terrain" | "level" | "height" | "heightRange" | "walkable" | "gnv" | "water" | "tree"

export const LAYER_MODES: { id: LayerMode; label: string }[] = [
	{ id: "terrain", label: "Terrain" },
	{ id: "level", label: "Level" },
	{ id: "height", label: "Height" },
	{ id: "heightRange", label: "Height range" },
	{ id: "walkable", label: "Walkable" },
	{ id: "gnv", label: "GridNav flags" },
	{ id: "water", label: "Water" },
	{ id: "tree", label: "Trees" }
]

export interface Swatch {
	colour: string
	label: string
	count?: number
}

export type Legend =
	| { kind: "swatches"; items: Swatch[] }
	| { kind: "gradient"; stops: string[]; min: string; max: string; caption: string }

/** How one layer colours a tile: its top, and the walls of cliffs it stands above. */
export interface LayerStyle {
	legend: Legend
	paint(i: number): { top: RGB; cliff: RGB }
}

export const hex = (value: number): RGB => [
	((value >> 16) & 255) / 255,
	((value >> 8) & 255) / 255,
	(value & 255) / 255
]
export const toCss = ([r, g, b]: RGB): string =>
	"#" +
	[r, g, b]
		.map((v) =>
			Math.round(Math.min(1, Math.max(0, v)) * 255)
				.toString(16)
				.padStart(2, "0")
		)
		.join("")
export const mix = (a: RGB, b: RGB, t: number): RGB => [
	a[0] + (b[0] - a[0]) * t,
	a[1] + (b[1] - a[1]) * t,
	a[2] + (b[2] - a[2]) * t
]
export const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]

/** Samples a gradient through evenly spaced stops at t in [0, 1]. */
export function ramp(stops: RGB[], t: number): RGB {
	const x = Math.min(1, Math.max(0, t)) * (stops.length - 1)
	const i = Math.min(stops.length - 2, Math.floor(x))
	return mix(stops[i], stops[i + 1], x - i)
}

export type TileClass = "void" | "water" | "cliff" | "forest" | "lane" | "ramp" | "grass"

/** What the terrain look draws a tile as. */
export function classify(model: MapModel, i: number): TileClass {
	if (!model.hasGround(i)) return "void"
	if (model.water[i]) return "water"
	if (!model.walkable[i]) return "cliff"
	if (model.tree[i]) return "forest"
	if (model.lane[i]) return "lane"
	if (model.heightRange[i] >= RAMP_RANGE) return "ramp"
	return "grass"
}

/** Radiant and Dire colours for each terrain class. */
export const TERRAIN: Record<
	Exclude<TileClass, "void">,
	[radiant: RGB, dire: RGB, label: string]
> = {
	grass: [hex(0x6f9d4a), hex(0x625b45), "Grass"],
	forest: [hex(0x3c6833), hex(0x463f30), "Forest floor (tree tiles)"],
	lane: [hex(0xb49668), hex(0x88695a), "Lane road"],
	ramp: [hex(0xc6ad7b), hex(0x9c836c), "Ramp / slope"],
	cliff: [hex(0x8e897b), hex(0x5d5452), "Cliff / not walkable"],
	water: [hex(0x4f8a8c), hex(0x4a6878), "Water"]
}

const NO_GROUND: RGB = hex(0x101522)
const DIM: RGB = hex(0x34343a)

function counts<K>(model: MapModel, key: (i: number) => K | undefined): Map<K, number> {
	const out = new Map<K, number>()
	for (let i = 0; i < model.count; i++) {
		const k = key(i)
		if (k !== undefined) out.set(k, (out.get(k) ?? 0) + 1)
	}
	return out
}

/** Per-tile brightness: a faint checkerboard plus jitter, so single tiles read. */
function texture(model: MapModel, i: number): number {
	const col = i % model.cols
	const row = (i - col) / model.cols
	return ((col + row) & 1 ? 1 : 0.95) * (0.97 + hash2(col, row, 11) * 0.06)
}

function terrainStyle(model: MapModel): LayerStyle {
	const tally = counts(model, (i) => {
		const k = classify(model, i)
		return k === "void" ? undefined : k
	})
	// Each swatch is split: Radiant's shade on the left, Dire's on the right.
	const items: Swatch[] = Object.entries(TERRAIN).map(([k, [radiant, dire, label]]) => ({
		colour: `linear-gradient(90deg, ${toCss(radiant)} 50%, ${toCss(dire)} 50%)`,
		label,
		count: tally.get(k as Exclude<TileClass, "void">) ?? 0
	}))
	return {
		legend: { kind: "swatches", items },
		paint(i) {
			const k = classify(model, i)
			if (k === "void") return { top: NO_GROUND, cliff: NO_GROUND }
			const side = model.side[i]
			const [radiant, dire] = TERRAIN[k]
			const level = model.level[i]
			const lift =
				k === "cliff" || k === "water" ? 1 : Math.min(1.2, Math.max(0.88, 1 + 0.05 * (level - 1)))
			const shade = texture(model, i)
			const stone = mix(TERRAIN.cliff[0], TERRAIN.cliff[1], side)
			return {
				top: scale(mix(radiant, dire, side), lift * shade),
				cliff: scale(stone, 0.82 * shade)
			}
		}
	}
}

/** The cartographer preview's level ramp: violet (lowest) → sand → green → pale (highest). */
const LEVEL_STOPS = [0x3f2a63, 0x3d6fa8, 0xd9c48f, 0x6aa553, 0xeef2df].map(hex)

function levelStyle(model: MapModel): LayerStyle {
	const span = model.data.meta.levels.walkable ?? model.data.meta.levels.ground ?? [0, 1]
	const [lo, hi] = span
	const colour = (level: number) => ramp(LEVEL_STOPS, hi > lo ? (level - lo) / (hi - lo) : 0.5)
	const tally = counts(model, (i) =>
		model.walkable[i] && model.hasGround(i) ? model.level[i] : undefined
	)
	const items: Swatch[] = []
	for (let level = hi; level >= lo; level--) {
		if (!tally.get(level)) continue
		items.push({
			colour: toCss(colour(level)),
			label: `Level ${String(level)}`,
			count: tally.get(level) ?? 0
		})
	}
	items.push({ colour: toCss(mix(colour(lo), DIM, 0.6)), label: "Not walkable (dimmed)" })
	return {
		legend: { kind: "swatches", items },
		paint(i) {
			if (!model.hasGround(i)) return { top: NO_GROUND, cliff: NO_GROUND }
			let c = colour(model.level[i])
			if (!model.walkable[i]) c = mix(c, DIM, 0.6)
			return overlay(scale(c, texture(model, i)))
		}
	}
}

const HEIGHT_STOPS = [0x440154, 0x3b528b, 0x21918c, 0x5ec962, 0xfde725].map(hex)
const RANGE_STOPS = [0x1d2433, 0x3f6fb0, 0xf2c14e, 0xe4572e].map(hex)
const RANGE_MAX = 256

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 })

function heightStyle(model: MapModel): LayerStyle {
	const { minHeight: lo, maxHeight: hi } = model
	return {
		legend: {
			kind: "gradient",
			stops: HEIGHT_STOPS.map(toCss),
			min: fmt(lo),
			max: fmt(hi),
			caption: "Ground height (game units)"
		},
		paint(i) {
			if (!model.hasGround(i)) return { top: NO_GROUND, cliff: NO_GROUND }
			return overlay(
				scale(ramp(HEIGHT_STOPS, (model.height[i] - lo) / (hi - lo || 1)), texture(model, i))
			)
		}
	}
}

function rangeStyle(model: MapModel): LayerStyle {
	return {
		legend: {
			kind: "gradient",
			stops: RANGE_STOPS.map(toCss),
			min: "0",
			max: `${String(RANGE_MAX)}+`,
			caption: "Height range inside the tile (game units)"
		},
		paint(i) {
			if (!model.hasGround(i)) return { top: NO_GROUND, cliff: NO_GROUND }
			return overlay(scale(ramp(RANGE_STOPS, model.heightRange[i] / RANGE_MAX), texture(model, i)))
		}
	}
}

/** A layer that sorts tiles into a few buckets, each with a colour and a legend entry. */
function bucketStyle<K>(
	model: MapModel,
	bucket: (i: number) => K,
	describe: (key: K) => { colour: RGB; label: string; order?: number }
): LayerStyle {
	const tally = counts(model, (i) => (model.hasGround(i) ? bucket(i) : undefined))
	const keys = [...tally.keys()].sort(
		(a, b) =>
			(describe(a).order ?? 0) - (describe(b).order ?? 0) ||
			(tally.get(b) ?? 0) - (tally.get(a) ?? 0)
	)
	return {
		legend: {
			kind: "swatches",
			items: keys.map((k) => {
				const { colour, label } = describe(k)
				return { colour: toCss(colour), label, count: tally.get(k) }
			})
		},
		paint(i) {
			if (!model.hasGround(i)) return { top: NO_GROUND, cliff: NO_GROUND }
			return overlay(scale(describe(bucket(i)).colour, texture(model, i)))
		}
	}
}

const GNV_COLOURS: Record<number, number> = {
	0: 0x1f1f26,
	1: 0x6cc070,
	4: 0xc77dff,
	5: 0x9d7ce0,
	13: 0xe0a458,
	16: 0x5b6a8a,
	17: 0x45a3a0,
	20: 0x3a3d4a,
	25: 0xd96c6c
}
const GNV_FALLBACK = [0xf28482, 0x84a59d, 0xf6bd60, 0x7b9acc, 0xb5838d]

const FLAG_WORDS: Record<string, string> = {
	traversable: "traversable",
	blocked: "blocked",
	heroBlocking: "hero-blocking",
	creatureBlocking: "creature-blocking",
	wardBlocking: "ward-blocking"
}

export function describeGnv(value: number, flags: Record<string, number>): string {
	const names = gnvFlagNames(value, flags).map((n) => FLAG_WORDS[n] ?? n)
	return names.length ? names.join(", ") : "no flags"
}

/** Walls in data layers are just a darker version of the top. */
const overlay = (top: RGB) => ({ top, cliff: scale(top, 0.72) })

export function layerStyle(model: MapModel, mode: LayerMode): LayerStyle {
	switch (mode) {
		case "terrain":
			return terrainStyle(model)
		case "level":
			return levelStyle(model)
		case "height":
			return heightStyle(model)
		case "heightRange":
			return rangeStyle(model)
		case "walkable":
			return bucketStyle(
				model,
				(i) => model.walkable[i] === 1,
				(walkable) =>
					walkable ?
						{ colour: hex(0x6cc070), label: "Walkable", order: 0 }
					:	{ colour: hex(0x4b4b55), label: "Not walkable", order: 1 }
			)
		case "gnv": {
			const flags = model.data.meta.gnvFlags
			return bucketStyle(
				model,
				(i) => model.gnv[i],
				(value) => ({
					colour: hex(GNV_COLOURS[value] ?? GNV_FALLBACK[value % GNV_FALLBACK.length]),
					label: `${String(value)} · ${describeGnv(value, flags)}`
				})
			)
		}
		case "water":
			return bucketStyle(
				model,
				(i) => model.water[i] === 1,
				(water) =>
					water ?
						{ colour: hex(0x3b82c4), label: "Water", order: 0 }
					:	{ colour: hex(0x6b6f5f), label: "Dry ground", order: 1 }
			)
		case "tree":
			return bucketStyle(
				model,
				(i) =>
					model.tree[i] ? "tree"
					: model.walkable[i] ? "open"
					: "blocked",
				(k) =>
					k === "tree" ? { colour: hex(0x2f6a2c), label: "Tree tile", order: 0 }
					: k === "open" ? { colour: hex(0xcbbd8f), label: "Open, walkable", order: 1 }
					: { colour: hex(0x57575e), label: "Not walkable", order: 2 }
			)
	}
}
