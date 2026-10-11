<!--
	News under the clock for a few seconds: a hero slain, a Sentinel fallen. Green when it's good
	for the player's side, red when it isn't.
-->
<script lang="ts">
	import { getGameState } from "#lib/game/GameState.svelte.ts"

	const game = getGameState()
</script>

<ul aria-label="News" aria-live="polite">
	{#each game.notices as notice (notice.id)}
		<li class:good={notice.good}>{notice.text}</li>
	{/each}
</ul>

<style>
	ul {
		position: fixed;
		z-index: 2;
		top: 64px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
		pointer-events: none;
	}
	li {
		font-family: var(--display);
		font-size: 15px;
		letter-spacing: 0.03em;
		color: var(--dire);
		background: rgb(8 12 26 / 0.8);
		border: 1px solid rgb(205 189 140 / 0.5);
		border-radius: 4px;
		padding: 3px 12px;
		text-shadow: 0 1px 2px rgb(0 0 0 / 0.8);
	}
	.good {
		color: var(--radiant);
	}
</style>
