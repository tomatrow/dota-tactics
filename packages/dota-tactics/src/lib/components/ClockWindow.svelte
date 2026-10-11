<!--
	The score (kills by each side's hero), the game clock, the next wave's countdown, the game speed
	(F9 pauses) and a step of one tick (F10).
-->
<script lang="ts">
	import { getGameState, SPEEDS } from "#lib/game/GameState.svelte.ts"
	import { TICK_RATE } from "#lib/sim/constants.ts"

	const game = getGameState()

	const score = $derived.by(() => {
		void game.tick
		return { radiant: game.kills("radiant"), dire: game.kills("dire") }
	})

	const clock = (seconds: number) => {
		const s = Math.floor(seconds)
		return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}`
	}
</script>

<section class="win" aria-label="Game clock">
	<div class="score" title="Kills: Radiant – Dire">
		<span class="radiant">{score.radiant}</span>–<span class="dire">{score.dire}</span>
	</div>
	<div class="time">{clock(game.tick / TICK_RATE)}</div>
	<div class="wave">Next wave {clock(game.nextWave)}</div>
	<div class="speeds" aria-label="Game speed" role="group">
		{#each SPEEDS as speed (speed)}
			<button
				aria-pressed={game.speed === speed}
				onclick={(event) => {
					game.speed = speed
					event.currentTarget.blur()
				}}
				type="button"
			>
				{speed === 0 ? "❚❚"
				: speed === 0.5 ? "½×"
				: `${String(speed)}×`}
			</button>
		{/each}
		<button
			onclick={(event) => {
				game.step()
				event.currentTarget.blur()
			}}
			title="Pause and step one tick, 0.05 s (F10)"
			type="button"
		>
			Step
		</button>
	</div>
</section>

<style>
	section {
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 6px 12px;
	}
	.time {
		font-family: var(--display);
		/* Spectral's default figures are oldstyle: its 1 reads as an I. */
		font-variant-numeric: lining-nums tabular-nums;
		font-size: 22px;
		letter-spacing: 0.06em;
		min-width: 3.2em;
		text-align: center;
	}
	.score {
		font-family: var(--display);
		font-variant-numeric: lining-nums;
		font-size: 18px;
		display: flex;
		gap: 4px;
		color: var(--muted);
	}
	.radiant {
		color: var(--radiant);
	}
	.dire {
		color: var(--dire);
	}
	.wave {
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.speeds {
		display: flex;
		gap: 2px;
	}
	button {
		font: inherit;
		font-family: var(--mono);
		font-size: 12px;
		color: var(--fg);
		background: rgb(0 0 0 / 0.25);
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 2px 6px;
		cursor: pointer;
	}
	button[aria-pressed="true"] {
		border-color: var(--edge);
		color: var(--cursor);
	}
</style>
