<!--
	One game on one map: the board's viewer state and the game's state, shared with everything
	below, the 3D stage, the HUD (and, when a side wins, the end window) and the keys (Dota 2's
	defaults, DESIGN.md §11, and the tuning keys of milestone 6).
-->
<script lang="ts">
	import type { MapModel } from "dota-tactics-grid/map/model.ts"
	import type { JobId } from "#lib/content/heroes.ts"
	import type { Change } from "#lib/content/rules.ts"
	import type { Team } from "#lib/content/units.ts"
	import { setViewerState, ViewerState } from "dota-tactics-grid/state.svelte.ts"
	import { GameState, setGameState } from "#lib/game/GameState.svelte.ts"
	import ClockWindow from "./ClockWindow.svelte"
	import ControlsWindow from "./ControlsWindow.svelte"
	import EndWindow from "./EndWindow.svelte"
	import HeroWindow from "./HeroWindow.svelte"
	import Notices from "./Notices.svelte"
	import Stage from "./Stage.svelte"
	import TuningWindow from "./TuningWindow.svelte"
	import UnitWindow from "./UnitWindow.svelte"

	let {
		model,
		seed,
		job,
		side,
		tune
	}: { model: MapModel; seed: number; job: JobId; side: Team; tune: readonly Change[] } = $props()

	// One map, seed, hero, side and set of numbers per game: `{#key}` it to start another.
	// svelte-ignore state_referenced_locally
	const view = setViewerState(new ViewerState(model))
	view.visibility.lanes = false
	// svelte-ignore state_referenced_locally
	const game = setGameState(new GameState(view, seed, job, side, tune))
	// For poking at from the console and headless checks, in development only.
	$effect(() => {
		if (import.meta.env.DEV) Object.assign(window, { game })
	})

	function onkeydown(event: KeyboardEvent) {
		const typing =
			event.target instanceof Element && event.target.closest("input, select, textarea")
		if (typing || event.metaKey || event.ctrlKey || event.altKey) return
		if (event.key === " ") {
			event.preventDefault()
			game.following = true
			return
		}
		if (event.repeat) return
		switch (event.key.length === 1 ? event.key.toLowerCase() : event.key) {
			case "F1":
				event.preventDefault()
				game.selectHero()
				break
			case "F9":
				event.preventDefault()
				game.togglePause()
				break
			case "F10":
				event.preventDefault()
				game.step()
				break
			case "`":
				game.tuning = !game.tuning
				break
			case "Escape":
				game.cancel()
				break
			case "q":
				game.useAbility(0)
				break
			case "w":
				game.useAbility(1)
				break
			case "e":
				game.useAbility(2)
				break
			case "a":
				game.attackMove()
				break
			case "s":
			case "h":
				game.stop()
				break
			case "[":
				game.rotate(-1)
				break
			case "]":
				game.rotate(1)
				break
		}
	}

	function onkeyup(event: KeyboardEvent) {
		if (event.key === " ") game.following = false
	}
</script>

<svelte:window onblur={() => (game.following = false)} {onkeydown} {onkeyup} />

<Stage />
<ClockWindow />
<Notices />
<UnitWindow />
<HeroWindow />
<ControlsWindow />
<TuningWindow />
<EndWindow />
