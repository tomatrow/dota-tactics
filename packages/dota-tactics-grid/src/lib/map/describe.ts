import { entityExtras, entityTitle } from "./entities.ts"
import { classify, describeGnv } from "./layers.ts"
import { RAMP_RANGE, type MapModel } from "./model.ts"
import type { MapEntity, Team } from "./schema.ts"

export interface Description {
	title: string
	team: Team
	rows: [label: string, value: string][]
}

const n = (value: number) => Math.round(value).toLocaleString("en-US")
const signed = (value: number) => (value > 0 ? "+" : "") + n(value)
const yesNo = (flag: number | boolean) => (flag ? "Yes" : "No")

function sideOf(model: MapModel, i: number): Team {
	const side = model.side[i]
	return (
		side < 0.3 ? "radiant"
		: side > 0.7 ? "dire"
		: "none"
	)
}

/** Trees standing on this tile's corners (each covers the 2×2 tiles around its corner). */
export function treesOnCorners(model: MapModel, col: number, row: number): number {
	const x0 = model.originX + col * model.cell
	const y0 = model.originY + row * model.cell
	let count = 0
	for (const dx of [0, model.cell]) {
		for (const dy of [0, model.cell])
			if (model.treeAt.has(`${String(x0 + dx)},${String(y0 + dy)}`)) count++
	}
	return count
}

function tileName(model: MapModel, i: number): string {
	const level = model.level[i]
	switch (classify(model, i)) {
		case "void":
			return "Off the map"
		case "water":
			return level <= 0 ? "River" : "Pond"
		case "cliff":
			return model.heightRange[i] >= RAMP_RANGE ? "Cliff" : "Impassable ground"
		case "forest":
			return "Forest"
		case "lane":
			return "Lane"
		case "ramp":
			return "Ramp"
		case "grass":
			return (
				level <= 0 ? "Low ground"
				: level === 1 ? "Jungle"
				: "High ground"
			)
	}
}

export function describeTile(model: MapModel, col: number, row: number): Description {
	const i = model.index(col, row)
	const team = sideOf(model, i)
	const name = tileName(model, i)
	const prefix =
		team === "radiant" ? "Radiant "
		: team === "dire" ? "Dire "
		: ""
	const title = name === "Off the map" ? name : prefix + (prefix ? name.toLowerCase() : name)
	const [x, y] = model.tileCentre(col, row)
	const rows: [string, string][] = [
		["Tile", `${String(col)}, ${String(row)}`],
		["Centre", `${signed(x)}, ${signed(y)}`]
	]
	if (model.hasGround(i)) {
		rows.push(
			["Height", `${n(model.height[i])} · level ${String(model.level[i])}`],
			["Range", `${n(model.heightRange[i])} units`]
		)
	} else {
		rows.push(["Height", "no ground"])
	}
	const trees = treesOnCorners(model, col, row)
	rows.push(
		["Walkable", yesNo(model.walkable[i])],
		["Water", yesNo(model.water[i])],
		["Trees", model.tree[i] ? `blocked (${String(trees)} on corners)` : "none"],
		["GridNav", `${String(model.gnv[i])} · ${describeGnv(model.gnv[i], model.data.meta.gnvFlags)}`]
	)
	for (const entity of model.entitiesByTile.get(i) ?? []) rows.push(["Here", entityTitle(entity)])
	return { title, team, rows }
}

export function describeEntity(model: MapModel, e: MapEntity): Description {
	const cell = model.cellOf(e.x, e.y)
	const rows: [string, string][] = [
		["Kind", e.kind],
		["Class", e.class]
	]
	if (e.name) rows.push(["Name", e.name])
	if (e.unit) rows.push(["Unit", e.unit])
	rows.push(
		["Team", e.team],
		["Position", `${signed(e.x)}, ${signed(e.y)}, ${n(e.z)}`],
		["Facing", `${n(e.yaw)}°`],
		["Tile", cell ? `${String(cell[0])}, ${String(cell[1])}` : "off the grid"],
		...entityExtras(e)
	)
	return { title: entityTitle(e), team: e.team, rows }
}
