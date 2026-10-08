<script lang="ts">
	import { page } from "$app/state"
	import { Random } from "#lib/common/unity/Random.ts"
	import Battle from "#lib/components/Battle.svelte"

	// Unity's `UnityEngine.Random`: one for the whole game, so `?seed=` replays it all.
	const seedParam = page.url.searchParams.get("seed")
	const random = new Random(seedParam === null ? Random.randomSeed() : Number(seedParam))
	console.info(`Battle seed: ${random.seed} (replay with ?seed=${random.seed})`)

	// Unity's audio engine: one for the whole game. Browsers start it once the player has interacted
	// with the page (the music waits until then).
	const audio = typeof window === "undefined" ? undefined : new AudioContext()
	const unlock = () => {
		if (audio?.state === "suspended") void audio.resume()
	}

	// Unity's `Application.LoadLevel(0)` reloads the battle scene: a new `<Battle>`.
	let level = $state(0)
</script>

<svelte:head>
	<title>Tactics RPG</title>
</svelte:head>

<svelte:window onkeydown={unlock} onpointerdown={unlock} />

{#key level}
	<Battle {audio} onloadlevel={() => level++} {random} />
{/key}

<!-- The music's license (CC BY 4.0) asks for credit. Out of the keyboard's way: Enter confirms. -->
<footer>
	Music: “Strategy RPG Battle” by Brennan Anderson,
	<a href="https://creativecommons.org/licenses/by/4.0/" tabindex="-1">CC BY 4.0</a>
</footer>

<style>
	footer {
		position: fixed;
		right: 0.5em;
		bottom: 0.25em;
		color: rgb(255 255 255 / 0.8);
		text-shadow: 0 0 2px rgb(0 0 0 / 0.8);
		font:
			11px Arial,
			sans-serif;
	}

	a {
		color: inherit;
	}
</style>
