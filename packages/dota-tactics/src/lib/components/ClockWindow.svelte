<!--
	The game clock, the next wave's countdown, and the game speed (F9 pauses).
-->
<script lang="ts">
	import { getGameState, SPEEDS } from "#lib/game/GameState.svelte.ts"
	import { TICK_RATE } from "#lib/sim/constants.ts"

	const game = getGameState()

	const clock = (seconds: number) => {
		const s = Math.floor(seconds)
		return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}`
	}
</script>

<section class="win" aria-label="Game clock">
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
				{speed === 0 ? "❚❚" : `${String(speed)}×`}
			</button>
		{/each}
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
		font-size: 22px;
		letter-spacing: 0.06em;
		min-width: 3.2em;
		text-align: center;
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
