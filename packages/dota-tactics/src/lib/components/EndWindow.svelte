<!--
	The end of the game (DESIGN.md §11: the first side to destroy the other's mid T1 wins): victory
	or defeat, when, how the player's hero did, and another game. Closing it leaves the board as it
	ended.
-->
<script lang="ts">
	import { getGameState, teamName } from "#lib/game/GameState.svelte.ts"
	import { TICK_RATE } from "#lib/sim/constants.ts"

	const game = getGameState()
	let closed = $state(false)

	const info = $derived.by(() => {
		const winner = game.winner
		const hero = game.hero.hero
		if (!winner || !hero) return null
		const s = Math.floor(game.tick / TICK_RATE)
		const loser = winner === "radiant" ? "dire" : "radiant"
		return {
			won: winner === game.hero.team,
			fell: `The ${teamName(loser)} Sentinel T1 fell at ${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}.`,
			kills: hero.kills,
			deaths: hero.deaths,
			lastHits: hero.lastHits,
			denies: hero.denies,
			gold: hero.gold,
			again: `?job=${hero.job.id}&side=${game.hero.team}`
		}
	})
</script>

{#if info && !closed}
	<section class="win" aria-label="Game over" aria-live="polite">
		<h2 style:color={info.won ? "var(--cursor)" : "var(--dire)"}>
			{info.won ? "Victory" : "Defeat"}
		</h2>
		<p>{info.fell}</p>
		<dl>
			<dt>Kills / deaths</dt>
			<dd>{info.kills} / {info.deaths}</dd>
			<dt>Last hits / denies</dt>
			<dd>{info.lastHits} / {info.denies}</dd>
			<dt>Gold</dt>
			<dd>{info.gold}</dd>
		</dl>
		<div>
			<a data-sveltekit-reload href={info.again}>Play again</a>
			<button onclick={() => (closed = true)} type="button">Look at the board</button>
		</div>
	</section>
{/if}

<style>
	section {
		z-index: 3;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 320px;
		text-align: center;
		padding: 18px 22px;
	}
	h2 {
		margin: 0 0 4px;
		font-family: var(--display);
		font-size: 34px;
		letter-spacing: 0.08em;
	}
	p {
		margin: 0 0 12px;
		color: var(--muted);
	}
	dl {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2px 12px;
		margin: 0 0 14px;
		text-align: left;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-family: var(--mono);
		text-align: right;
	}
	div {
		display: flex;
		justify-content: center;
		gap: 10px;
	}
	a,
	button {
		font: inherit;
		color: var(--fg);
		background: rgb(0 0 0 / 0.25);
		border: 1px solid var(--edge);
		border-radius: 4px;
		padding: 4px 12px;
		cursor: pointer;
		text-decoration: none;
	}
	a {
		color: var(--cursor);
	}
</style>
