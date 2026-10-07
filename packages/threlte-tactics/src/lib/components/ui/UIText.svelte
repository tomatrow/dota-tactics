<!--
	A uGUI `Text` filling its rect: wraps, keeps runs of spaces, and clips what doesn't fit
	(horizontal overflow Wrap, vertical overflow Truncate). `bestFit` is Unity's Best Fit: the
	largest whole font size in [min, max] at which the text fits.
-->
<script lang="ts">
	import type { Attachment } from "svelte/attachments"
	import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"

	let {
		text,
		fontSize = 14,
		bestFit,
		alignment = TextAnchor.UpperLeft,
		color = "#323232"
	}: {
		text: string
		fontSize?: number
		bestFit?: [min: number, max: number]
		alignment?: TextAnchor
		color?: string
	} = $props()

	const flexAlign = ["flex-start", "center", "flex-end"] as const
	const textAlign = ["left", "center", "right"] as const

	/** Best fit, redone whenever the text changes (once the DOM shows it). */
	function fit(_text: string, [min, max]: [number, number]): Attachment<HTMLDivElement> {
		return (box) => {
			const content = box.firstElementChild as HTMLElement
			for (let size = max; size >= min; --size) {
				box.style.fontSize = `${size}px`
				const fits =
					content.offsetWidth <= box.clientWidth && content.offsetHeight <= box.clientHeight
				if (fits) break
			}
		}
	}
</script>

<div
	style:font-size={bestFit ? undefined : `${fontSize}px`}
	style:color
	style:align-items={flexAlign[Math.floor(alignment / 3)]}
	style:justify-content={flexAlign[alignment % 3]}
	style:text-align={textAlign[alignment % 3]}
	{@attach bestFit && fit(text, bestFit)}
>
	<span>{text}</span>
</div>

<style>
	div {
		position: absolute;
		inset: 0;
		display: flex;
		overflow: hidden;
		line-height: normal;
		white-space: pre-wrap;
	}
</style>
