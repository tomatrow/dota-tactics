<!--
	The 3D half of `Battle.unity`. Must be rendered inside a Threlte `<Canvas>`, under a
	`BattleController` context.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { getBattleController } from "#lib/controller/BattleController.svelte.ts"
	import BoardView from "./BoardView.svelte"
	import CameraRig from "./CameraRig.svelte"
	import Lighting from "./Lighting.svelte"
	import TileSelectionIndicator from "./prefabs/TileSelectionIndicator.svelte"
	import UnitView from "./UnitView.svelte"

	const battle = getBattleController()
</script>

<Lighting />
<T.Group name="Battle Controller">
	<CameraRig follow={battle.tileSelectionIndicator.position} />
	<BoardView board={battle.board} />
	<TileSelectionIndicator
		facingIndicator={{
			visible: battle.facingIndicator.active,
			selected: battle.facingIndicator.direction
		}}
		position={battle.tileSelectionIndicator.position}
	/>
	<T.Group name="Units">
		{#each battle.units as unit (unit)}
			<UnitView {unit} />
		{/each}
	</T.Group>
</T.Group>
