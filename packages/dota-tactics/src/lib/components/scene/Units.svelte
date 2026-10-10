<!--
	Everything the simulation has on the board: creeps, Sentinels' bars, and attacks in flight.
-->
<script lang="ts">
	import { getGameState } from "#lib/game/GameState.svelte.ts"
	import CreepView from "./CreepView.svelte"
	import Effects from "./Effects.svelte"
	import SentinelView from "./SentinelView.svelte"

	const game = getGameState()
</script>

{#each game.roster as unit (unit.id)}
	{#if unit.stats.structure}
		<SentinelView {unit} />
	{:else}
		<CreepView {unit} />
	{/if}
{/each}
<Effects />
