<!--
	One game on one map: the board's viewer state and the game's state, shared with everything
	below, the 3D stage, the HUD and the keys.
-->
<script lang="ts">
	import type { MapModel } from "dota-tactics-grid/map/model.ts"
	import { setViewerState, ViewerState } from "dota-tactics-grid/state.svelte.ts"
	import { GameState, setGameState } from "#lib/game/GameState.svelte.ts"
	import ClockWindow from "./ClockWindow.svelte"
	import ControlsWindow from "./ControlsWindow.svelte"
	import Stage from "./Stage.svelte"
	import UnitWindow from "./UnitWindow.svelte"

	let { model, seed }: { model: MapModel; seed: number } = $props()

	// One map and seed per game: `{#key}` it to start another.
	// svelte-ignore state_referenced_locally
	const view = setViewerState(new ViewerState(model))
	view.visibility.lanes = false
	// svelte-ignore state_referenced_locally
	const game = setGameState(new GameState(view, seed))
	// For poking at from the console and headless checks, in development only.
	$effect(() => {
		if (import.meta.env.DEV) Object.assign(window, { game })
	})

	// A click on the board (the board's picker pins what it hit) selects what's there.
	$effect(() => game.select(view.pinned))

	function onkeydown(event: KeyboardEvent) {
		const typing =
			event.target instanceof Element && event.target.closest("input, select, textarea")
		if (typing || event.metaKey || event.ctrlKey || event.altKey) return
		if (event.key === "F1") {
			event.preventDefault()
			game.centre()
		} else if (event.key === "F9") {
			event.preventDefault()
			game.togglePause()
		} else if (event.key === " ") {
			event.preventDefault()
			game.following = true
		} else if (event.key === "Escape") view.pinned = null
		else if (event.key === "[") game.rotate(-1)
		else if (event.key === "]") game.rotate(1)
	}

	function onkeyup(event: KeyboardEvent) {
		if (event.key === " ") game.following = false
	}
</script>

<svelte:window onblur={() => (game.following = false)} {onkeydown} {onkeyup} />

<Stage />
<ClockWindow />
<UnitWindow />
<ControlsWindow />
