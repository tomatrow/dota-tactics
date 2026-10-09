import type { MapEntity } from "#lib/map/schema.ts"

/** What the cursor is over, or what's pinned: a tile, or an entity (which also has a tile). */
export type Selection =
	| { kind: "tile"; col: number; row: number }
	| { kind: "entity"; entity: MapEntity; col: number; row: number }

export function sameSelection(a: Selection | null, b: Selection | null): boolean {
	if (!a || !b) return a === b
	if (a.kind === "entity" || b.kind === "entity") {
		return a.kind === b.kind && a.kind === "entity" && b.kind === "entity" && a.entity === b.entity
	}
	return a.col === b.col && a.row === b.row
}
