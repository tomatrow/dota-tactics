<!-- The `Board` GameObject: a `Tile` prefab instance for every tile of the board. -->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { Board } from "#lib/view-model-component/Board.svelte.ts"
	import Tile from "./prefabs/Tile.svelte"

	let { board }: { board: Board } = $props()
</script>

<T.Group name="Board">
	{#each board.tiles.values() as tile (tile)}
		<Tile color={tile.color} position={tile.localPosition} scale={tile.localScale} />
	{/each}
</T.Group>
