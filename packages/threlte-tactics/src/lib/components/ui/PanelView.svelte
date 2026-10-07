<!--
	Renders a `Panel` (Unity's RectTransform + `LayoutAnchor` + `Panel`): an absolutely positioned
	box in its parent, placed by the panel's anchor placement. `width`/`height` are the
	RectTransform's size in reference pixels (omit to fit the content).
-->
<script lang="ts">
	import type { Snippet } from "svelte"
	import type { Panel } from "#lib/common/ui/Panel.ts"

	let {
		panel,
		width,
		height,
		children
	}: { panel: Panel; width?: number; height?: number; children?: Snippet } = $props()

	const [parentX, parentY, myX, myY, offsetX, offsetY] = $derived(panel.anchor.placement)
</script>

<div
	style:left="calc({parentX * 100}% + {offsetX}px)"
	style:bottom="calc({parentY * 100}% + {offsetY}px)"
	style:translate="{-myX * 100}% {myY * 100}%"
	style:width={width === undefined ? undefined : `${width}px`}
	style:height={height === undefined ? undefined : `${height}px`}
>
	{@render children?.()}
</div>

<style>
	div {
		position: absolute;
	}
</style>
