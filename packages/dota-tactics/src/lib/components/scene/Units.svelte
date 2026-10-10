<!--
	Everything the simulation has on the board: heroes, creeps, Sentinels' bars, attacks in flight,
	order overlays and last-hit pop-ups.
-->
<script lang="ts">
	import { getGameState } from "#lib/game/GameState.svelte.ts"
	import CreepView from "./CreepView.svelte"
	import Effects from "./Effects.svelte"
	import HeroView from "./HeroView.svelte"
	import Overlays from "./Overlays.svelte"
	import Popups from "./Popups.svelte"
	import SentinelView from "./SentinelView.svelte"

	const game = getGameState()
</script>

{#each game.roster as unit (unit.id)}
	{#if unit.stats.structure}
		<SentinelView {unit} />
	{:else if unit.hero}
		<HeroView {unit} />
	{:else}
		<CreepView {unit} />
	{/if}
{/each}
<Effects />
<Overlays />
<Popups />
