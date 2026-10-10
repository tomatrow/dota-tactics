<!--
	One game on one map: the board's viewer state and the game's state, shared with everything
	below, the 3D stage, the HUD and the keys.
-->
<script lang="ts">
	import type { MapModel } from "dota-tactics-grid/map/model.ts"
	import { setViewerState, ViewerState } from "dota-tactics-grid/state.svelte.ts"
	import { GameState, setGameState } from "#lib/game/GameState.svelte.ts"
	import ControlsWindow from "./ControlsWindow.svelte"
	import Stage from "./Stage.svelte"

	let { model }: { model: MapModel } = $props()

	// One map per game: `{#key}` it to load another.
	// svelte-ignore state_referenced_locally
	const view = setViewerState(new ViewerState(model))
	const game = setGameState(new GameState(view))

	function onkeydown(event: KeyboardEvent) {
		const typing =
			event.target instanceof Element && event.target.closest("input, select, textarea")
		if (typing || event.metaKey || event.ctrlKey || event.altKey) return
		if (event.key === "F1") {
			event.preventDefault()
			game.centre()
		} else if (event.key === " ") {
			event.preventDefault()
			game.following = true
		} else if (event.key === "[") game.rotate(-1)
		else if (event.key === "]") game.rotate(1)
	}

	function onkeyup(event: KeyboardEvent) {
		if (event.key === " ") game.following = false
	}
</script>

<svelte:window onblur={() => (game.following = false)} {onkeydown} {onkeyup} />

<Stage />
<ControlsWindow />
