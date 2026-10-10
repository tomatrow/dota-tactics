<!--
	Dota's last-hit feedback over creeps the hero killed: the gold earned, or "!" for a deny. They
	rise and fade, under the HUD's windows.
-->
<script lang="ts">
	import { HTML } from "@threlte/extras"
	import { getGameState, POPUP_TIME } from "#lib/game/GameState.svelte.ts"

	const game = getGameState()
</script>

{#each game.popups as popup (popup.id)}
	<HTML center pointerEvents="none" position={popup.position} zIndexRange={[1, 0]}>
		<span style:animation-duration="{POPUP_TIME}s" class={popup.kind}>{popup.text}</span>
	</HTML>
{/each}

<style>
	span {
		display: block;
		font-family: var(--display);
		font-size: 18px;
		font-weight: 700;
		text-shadow:
			0 1px 0 #000,
			0 0 6px rgb(0 0 0 / 0.8);
		white-space: nowrap;
		animation-name: rise;
		animation-timing-function: ease-out;
		animation-fill-mode: forwards;
	}
	.gold {
		color: #ffd24a;
	}
	.deny {
		color: #f2f2f2;
		font-size: 22px;
	}
	@keyframes rise {
		from {
			transform: translateY(0);
			opacity: 1;
		}
		70% {
			opacity: 1;
		}
		to {
			transform: translateY(-28px);
			opacity: 0;
		}
	}
</style>
