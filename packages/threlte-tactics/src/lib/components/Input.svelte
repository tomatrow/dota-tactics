<!--
	Keyboard input for the game: wires window key events into an `InputController` and runs its
	per-frame `update` while a direction is held.
-->
<script lang="ts">
	import { onDestroy } from "svelte"
	import { InputController } from "#lib/controller/InputController.ts"
	import type { Point } from "#lib/model/Point.ts"

	let {
		onmove,
		onfire
	}: {
		/** A direction on the board (or menu), repeating while held. */
		onmove?: (direction: Point) => void
		/** The index of a released Fire button: 0 confirm, 1 cancel. */
		onfire?: (button: number) => void
	} = $props()

	const input = new InputController({
		move: (direction) => onmove?.(direction),
		fire: (button) => onfire?.(button)
	})

	let frame = 0

	function now(): number {
		return performance.now() / 1000
	}

	function tick(): void {
		input.update(now())
		frame = input.moving ? requestAnimationFrame(tick) : 0
	}

	function keydown(event: KeyboardEvent): void {
		// Leave browser and OS shortcuts alone.
		if (event.metaKey || event.ctrlKey || event.altKey) return
		if (!input.keyDown(event.code)) return
		event.preventDefault()
		if (event.repeat) return
		// Register a press right away, then keep polling.
		if (frame) input.update(now())
		else tick()
	}

	function keyup(event: KeyboardEvent): void {
		// macOS swallows key-ups while cmd is held, so a released cmd may leave keys "held".
		if (event.key === "Meta") input.releaseAll()
		if (input.keyUp(event.code)) event.preventDefault()
	}

	function blur(): void {
		input.releaseAll()
	}

	onDestroy(() => cancelAnimationFrame(frame))
</script>

<svelte:window onblur={blur} onkeydown={keydown} onkeyup={keyup} />
