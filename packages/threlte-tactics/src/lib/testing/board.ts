import type { LevelData } from "#lib/model/LevelData.ts"
import { Board } from "#lib/view-model-component/Board.svelte.ts"

/**
 * A loaded board from rows of single-digit heights: row 0 is y = 0, column 0 is x = 0, and `.` is
 * a hole. Tiles load row by row.
 */
export function board(...rows: string[]): Board {
	const tiles: LevelData["tiles"] = []
	rows.forEach((row, y) => {
		;[...row].forEach((h, x) => {
			if (h !== ".") tiles.push([x, Number(h), y])
		})
	})
	const b = new Board()
	b.load({ tiles })
	return b
}

/** Tiles' positions, sorted (`"(x,y)"`). */
export const positions = (tiles: readonly { pos: { toString(): string } }[]): string[] =>
	tiles.map((t) => `${t.pos}`).sort()
