<!--
	A uGUI `RectTransform`: places its content in the parent rect from the values in a prefab, used
	verbatim (reference pixels, y up). Children fill it.
-->
<script lang="ts">
	import type { Snippet } from "svelte"
	import type { Vector2 } from "#lib/common/vector.ts"

	let {
		anchorMin = [0.5, 0.5],
		anchorMax = [0.5, 0.5],
		anchoredPosition = [0, 0],
		sizeDelta = [100, 100],
		pivot = [0.5, 0.5],
		scale = [1, 1],
		children
	}: {
		anchorMin?: Vector2
		anchorMax?: Vector2
		anchoredPosition?: Vector2
		sizeDelta?: Vector2
		pivot?: Vector2
		scale?: Vector2
		children?: Snippet
	} = $props()

	// Unity puts the pivot at the anchors' reference point (the anchors lerped by the pivot) plus
	// `anchoredPosition`; the rect is the anchors' span plus `sizeDelta`. Solved for the rect's
	// lower-left corner, the parent-relative parts are just `anchorMin`.
	const left = $derived(
		`calc(${anchorMin[0] * 100}% + ${anchoredPosition[0] - pivot[0] * sizeDelta[0]}px)`
	)
	const bottom = $derived(
		`calc(${anchorMin[1] * 100}% + ${anchoredPosition[1] - pivot[1] * sizeDelta[1]}px)`
	)
	const width = $derived(`calc(${(anchorMax[0] - anchorMin[0]) * 100}% + ${sizeDelta[0]}px)`)
	const height = $derived(`calc(${(anchorMax[1] - anchorMin[1]) * 100}% + ${sizeDelta[1]}px)`)
</script>

<div
	style:left
	style:bottom
	style:width
	style:height
	style:scale="{scale[0]}
	{scale[1]}"
	style:transform-origin="{pivot[0] * 100}% {(1 - pivot[1]) * 100}%"
>
	{@render children?.()}
</div>

<style>
	div {
		position: absolute;
	}
</style>
