<!--
	The controls that work so far (Dota 2's defaults), in an FFT-style window, and which hero and
	side to play (the AI plays the other hero, for the other side): a link reloads the page as
	another game.
-->
<script lang="ts">
	import { JOB_IDS, JOBS } from "#lib/content/heroes.ts"
	import { getGameState, teamName } from "#lib/game/GameState.svelte.ts"

	const game = getGameState()
	const job = $derived(game.hero.hero?.job.id)
	const side = $derived(game.hero.team)
</script>

<dl class="win">
	<dt>Right-click</dt>
	<dd>Move, attack; deny own creep under 50%</dd>
	<dt>Q W E</dt>
	<dd>Abilities; left-click a target</dd>
	<dt>A, left-click</dt>
	<dd>Attack-move</dd>
	<dt>S / H</dt>
	<dd>Stop</dd>
	<dt>Esc, right-click</dt>
	<dd>Cancel targeting</dd>
	<dt>Left-click</dt>
	<dd>Inspect a unit</dd>
	<dt>F1 · Space (hold)</dt>
	<dd>Centre on · follow your hero</dd>
	<dt>F9</dt>
	<dd>Pause</dd>
	<dt>Edge, middle-drag · wheel</dt>
	<dd>Pan · zoom</dd>
	<dt>[ &nbsp;]</dt>
	<dd>Turn 90°</dd>
	<dt>Play as</dt>
	<dd class="choices">
		{#each JOB_IDS as id (id)}
			<a aria-current={id === job} data-sveltekit-reload href="?job={id}&side={side}">
				{JOBS[id].race}
				{JOBS[id].name}
			</a>
		{/each}
	</dd>
	<dt>For</dt>
	<dd class="choices">
		{#each ["radiant", "dire"] as const as team (team)}
			<a aria-current={team === side} data-sveltekit-reload href="?job={job}&side={team}">
				{teamName(team)}
			</a>
		{/each}
	</dd>
</dl>

<style>
	dl {
		left: 12px;
		top: 12px;
		margin: 0;
		display: grid;
		grid-template-columns: auto auto;
		gap: 2px 14px;
		font-size: 12px;
	}
	dt {
		font-family: var(--mono);
		color: var(--cursor);
	}
	dd {
		margin: 0;
	}
	.choices {
		display: flex;
		gap: 10px;
	}
	a {
		color: var(--fg);
	}
	a[aria-current="true"] {
		color: var(--cursor);
		text-decoration: none;
	}
</style>
