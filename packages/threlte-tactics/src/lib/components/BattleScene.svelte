<!-- The 3D half of `Battle.unity`. Must be rendered inside a Threlte `<Canvas>`. -->
<script lang="ts">
	import UnityWorld from "#lib/common/unity/UnityWorld.svelte"
	import type { Board } from "#lib/view-model-component/Board.svelte.ts"
	import BoardView from "./BoardView.svelte"
	import CameraRig from "./CameraRig.svelte"
	import Lighting from "./Lighting.svelte"

	let { board }: { board: Board } = $props()

	// Stand-in until the camera follows the tile selection indicator (part 5): look at the first
	// tile, which is where `InitBattleState` puts the cursor.
	const focus = $derived(board.tiles.values().next().value?.center)
</script>

<UnityWorld>
	<CameraRig position={focus} />
	<Lighting />
	<BoardView {board} />
</UnityWorld>
