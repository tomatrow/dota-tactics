<!--
	The 3D half of `Battle.unity`. Must be rendered inside a Threlte `<Canvas>`, under a
	`BattleController` context.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import UnityWorld from "#lib/common/unity/UnityWorld.svelte"
	import { getBattleController } from "#lib/controller/BattleController.svelte.ts"
	import BoardView from "./BoardView.svelte"
	import CameraRig from "./CameraRig.svelte"
	import Lighting from "./Lighting.svelte"
	import TileSelectionIndicator from "./prefabs/TileSelectionIndicator.svelte"

	const battle = getBattleController()
</script>

<UnityWorld>
	<Lighting />
	<T.Group name="Battle Controller">
		<CameraRig follow={battle.tileSelectionIndicator.localPosition} />
		<BoardView board={battle.board} />
		<TileSelectionIndicator position={battle.tileSelectionIndicator.localPosition} />
	</T.Group>
</UnityWorld>
