import { render } from "@threlte/test"
import { expect, test } from "vitest"
import { Board } from "#lib/view-model-component/Board.svelte.ts"
import BoardView from "./BoardView.svelte"

test("renders a tile mesh per board tile, sized to its height", () => {
	const board = new Board()
	board.load({
		tiles: [
			[0, 1, 0],
			[1, 4, 2]
		]
	})
	const { scene } = render(BoardView, { board })

	const tiles = scene.getObjectByName("Board")?.children ?? []
	expect(tiles).toHaveLength(2)
	// Board row 2 is 2 units north, along −Z.
	expect(tiles[1]?.position.toArray()).toEqual([1, 0.5, -2])
	expect(tiles[1]?.scale.toArray()).toEqual([1, 1, 1])
})
