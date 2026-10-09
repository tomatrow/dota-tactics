<!--
	`Battle.unity`'s Music object: a `MusicPlayer` with the battle music (by Brennan Anderson, CC BY
	4.0), from when it has loaded for as long as the battle lasts.
-->
<script lang="ts">
	import { onMount } from "svelte"
	import intro from "#lib/assets/audio/music/Strategy RPG Battle_Intro.m4a"
	import loop from "#lib/assets/audio/music/Strategy RPG Battle_Loop.m4a"
	import { MusicPlayer } from "#lib/audio/MusicPlayer.ts"
	import { AudioClip } from "#lib/common/audio.ts"

	let {
		context
	}: {
		/** The game's audio engine. */
		context: BaseAudioContext
	} = $props()

	onMount(() => {
		let player: MusicPlayer | null = null
		let destroyed = false
		Promise.all([
			AudioClip.load(context, "Strategy RPG Battle_Intro", intro),
			AudioClip.load(context, "Strategy RPG Battle_Loop", loop)
		]).then(
			([introClip, loopClip]) => {
				if (destroyed) return
				player = new MusicPlayer(introClip, loopClip)
				player.start(context)
			},
			// The battle goes on without music.
			(error: unknown) => console.error("Couldn't load the music:", error)
		)
		return () => {
			destroyed = true
			player?.stop()
		}
	})
</script>
