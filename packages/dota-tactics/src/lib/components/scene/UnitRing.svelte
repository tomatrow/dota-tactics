<!--
	A unit's ring on the ground: red or green under the pointer (an enemy or an ally of the hero:
	what a right-click would do), else yellow when it's selected.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { getGameState } from "#lib/game/GameState.svelte.ts"
	import type { Unit } from "#lib/sim/unit.ts"

	let {
		unit,
		radius,
		width = 0.18
	}: {
		unit: Unit
		/** Inner radius, in tiles. */
		radius: number
		width?: number
	} = $props()

	const game = getGameState()
	const colour = $derived(
		game.hovered === unit ?
			unit.team === game.hero.team ?
				0x7be08f
			:	0xff6a55
		: game.selected === unit ? 0xffe39a
		: null
	)
</script>

{#if colour !== null}
	<T.Mesh position.y={0.04} renderOrder={3} rotation.x={-Math.PI / 2}>
		<T.RingGeometry args={[radius, radius + width, 48]} />
		<T.MeshBasicMaterial color={colour} depthWrite={false} toneMapped={false} transparent />
	</T.Mesh>
{/if}
