<!--
	A Sentinel's bars over its tower model (the board draws the model), and a ring when selected.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { getGameState } from "#lib/game/GameState.svelte.ts"
	import type { Unit } from "#lib/sim/unit.ts"
	import Bars from "./Bars.svelte"

	let { unit }: { unit: Unit } = $props()

	const game = getGameState()
	const position = $derived(game.toScene(unit.col, unit.row))
	const radius = $derived(unit.stats.radius + 0.5)
</script>

<T.Group name="sentinel" {position}>
	{#if game.selected === unit}
		<T.Mesh position.y={0.04} renderOrder={3} rotation.x={-Math.PI / 2}>
			<T.RingGeometry args={[radius, radius + 0.15, 48]} />
			<T.MeshBasicMaterial color={0xffe39a} depthWrite={false} toneMapped={false} transparent />
		</T.Mesh>
	{/if}
	<Bars height={4} {unit} width={2} />
</T.Group>
