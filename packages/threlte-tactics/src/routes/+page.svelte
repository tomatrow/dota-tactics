<script lang="ts">
	import { page } from "$app/state"
	import { Random } from "#lib/common/unity/Random.ts"
	import Battle from "#lib/components/Battle.svelte"

	// Unity's `UnityEngine.Random`: one for the whole game, so `?seed=` replays it all.
	const seedParam = page.url.searchParams.get("seed")
	const random = new Random(seedParam === null ? Random.randomSeed() : Number(seedParam))
	console.info(`Battle seed: ${random.seed} (replay with ?seed=${random.seed})`)

	// Unity's `Application.LoadLevel(0)` reloads the battle scene: a new `<Battle>`.
	let level = $state(0)
</script>

<svelte:head>
	<title>Tactics RPG</title>
</svelte:head>

{#key level}
	<Battle onloadlevel={() => level++} {random} />
{/key}
