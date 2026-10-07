<!--
	Renders an `AbilityMenuEntry`: `Ability Menu Entry.prefab`, a row laid out by a horizontal layout
	group (left padding 40, spacing 4, top aligned): the bullet at its native size, then the label
	with its outline.
-->
<script lang="ts">
	import { sprites } from "#lib/assets/textures/ui/sprites.ts"
	import type { AbilityMenuEntry } from "#lib/view-model-component/AbilityMenuEntry.svelte.ts"

	let { entry }: { entry: AbilityMenuEntry } = $props()

	const bullet = $derived(sprites[entry.bullet])
	// Unity's `Outline` (effect distance 1, -1): the text drawn four times, offset diagonally.
	const outline = $derived(
		[
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1]
		]
			.map(([x, y]) => `${x}px ${y}px 0 ${entry.outlineColor}`)
			.join(", ")
	)
</script>

<div>
	<img alt="" height={bullet.height} src={bullet.src} width={bullet.width} />
	<span style:color={entry.labelColor} style:text-shadow={outline}>{entry.title}</span>
</div>

<style>
	div {
		display: flex;
		align-items: flex-start;
		gap: 4px;
		padding-left: 40px;
	}

	span {
		font-size: 18px;
		line-height: normal;
		white-space: pre;
	}
</style>
