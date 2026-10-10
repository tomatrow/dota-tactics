<!--
	The selected unit: who it is, its HP and gauge, its stats, and what it's doing. Refreshed every
	tick.
-->
<script lang="ts">
	import { getGameState } from "#lib/game/GameState.svelte.ts"
	import { GAUGE_FULL } from "#lib/sim/constants.ts"

	const game = getGameState()

	const info = $derived.by(() => {
		void game.tick
		const unit = game.selected
		if (!unit) return null
		const { stats } = unit
		const doing =
			unit.step ? "Walking"
			: unit.target ? `Fighting ${unit.target.name}`
			: "Waiting"
		return {
			name: unit.name,
			team: unit.team,
			hp: unit.hp,
			maxHp: stats.hp,
			gauge: Math.floor((unit.gauge / GAUGE_FULL) * 100),
			stats: [
				["ATK", stats.atk],
				["DEF", stats.def],
				["Speed", stats.speed],
				["Reach", stats.reach]
			] as const,
			doing
		}
	})
</script>

{#if info}
	<section class="win" aria-label="Selected unit">
		<header>
			<strong>{info.name}</strong>
			<span class={info.team}>{info.team === "radiant" ? "Radiant" : "Dire"}</span>
		</header>
		<div class="bar">
			<span>HP</span>
			<meter max={info.maxHp} min="0" value={info.hp}></meter>
			<span class="num">{info.hp}/{info.maxHp}</span>
		</div>
		<div class="bar">
			<span>CT</span>
			<meter max="100" min="0" value={info.gauge}></meter>
			<span class="num">{info.gauge}</span>
		</div>
		<dl>
			{#each info.stats as [label, value] (label)}
				<dt>{label}</dt>
				<dd>{value}</dd>
			{/each}
		</dl>
		<p>{info.doing}</p>
	</section>
{/if}

<style>
	section {
		right: 12px;
		bottom: 12px;
		width: 230px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-family: var(--display);
		font-size: 16px;
		margin-bottom: 6px;
	}
	header span {
		font-family: var(--body);
		font-size: 12px;
	}
	.radiant {
		color: var(--radiant);
	}
	.dire {
		color: var(--dire);
	}
	.bar {
		display: grid;
		grid-template-columns: 2em 1fr 5.5em;
		align-items: center;
		gap: 6px;
	}
	meter {
		width: 100%;
		height: 10px;
	}
	.num {
		font-family: var(--mono);
		font-size: 12px;
		text-align: right;
	}
	dl {
		display: grid;
		grid-template-columns: auto auto auto auto;
		gap: 0 10px;
		margin: 8px 0 4px;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-family: var(--mono);
	}
	p {
		margin: 0;
		color: var(--cursor);
	}
</style>
