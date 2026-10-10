<!--
	Advances the game every frame, before anything that reads it (the camera, the units) runs.
-->
<script lang="ts">
	import { useStage, useTask, useThrelte } from "@threlte/core"
	import { getGameState } from "#lib/game/GameState.svelte.ts"

	const game = getGameState()
	const { mainStage } = useThrelte()
	const gameStage = useStage("game", { before: mainStage })

	useTask((delta) => game.advance(delta), { stage: gameStage })
</script>
