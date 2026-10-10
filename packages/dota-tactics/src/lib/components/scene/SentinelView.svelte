<!--
	A Sentinel's bars over its tower model (the board draws the model), and a ring when it's
	selected or under the pointer.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { getGameState } from "#lib/game/GameState.svelte.ts"
	import type { Unit } from "#lib/sim/unit.ts"
	import Bars from "./Bars.svelte"
	import UnitRing from "./UnitRing.svelte"

	let { unit }: { unit: Unit } = $props()

	const game = getGameState()
	const position = $derived(game.toScene(unit.col, unit.row))
	const radius = $derived(unit.stats.radius + 0.5)
</script>

<T.Group name="sentinel" {position}>
	<UnitRing {radius} {unit} width={0.15} />
	<Bars height={4} {unit} width={2} />
</T.Group>
