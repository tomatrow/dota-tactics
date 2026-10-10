<!--
	Milestone 1's stand-in for a unit: a Radiant-green pawn with a blob shadow. Moving things don't
	cast real shadows: the board's shadow map is only re-rendered when the board changes.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { TEAM_COLOURS } from "dota-tactics-grid/scene/palette.ts"
	import { getGameState } from "#lib/game/GameState.svelte.ts"

	const game = getGameState()
</script>

<T.Group name="walker" position={game.walker}>
	<T.Mesh position.y={0.02} renderOrder={1} rotation.x={-Math.PI / 2}>
		<T.CircleGeometry args={[0.55, 24]} />
		<T.MeshBasicMaterial color={0x000000} depthWrite={false} opacity={0.35} transparent />
	</T.Mesh>
	<T.Mesh position.y={0.8}>
		<T.CapsuleGeometry args={[0.36, 0.9, 4, 12]} />
		<T.MeshStandardMaterial color={TEAM_COLOURS.radiant} roughness={0.6} />
	</T.Mesh>
</T.Group>
