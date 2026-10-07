<!--
	A uGUI `Image`: draws a sprite over its whole rect. `Sliced` uses the sprite's 9-slice border
	(at 1 sprite pixel per reference pixel, as every sprite here is imported), drawn on a canvas at
	the screen's resolution: CSS `border-image` leaves hairline seams between slices at fractional
	scales.
-->
<script lang="ts">
	import type { Attachment } from "svelte/attachments"
	import { on } from "svelte/events"
	import { sprites, type Sprite, type SpriteName } from "#lib/assets/textures/ui/sprites.ts"

	let { sprite, type = "Simple" }: { sprite: SpriteName; type?: "Simple" | "Sliced" } = $props()

	const s: Sprite = $derived(sprites[sprite])

	function sliced({ src, width, height, border }: Sprite): Attachment<HTMLCanvasElement> {
		return (canvas) => {
			const { left = 0, top = 0, right = 0, bottom = 0 } = border ?? {}
			const image = new Image()
			image.src = src

			function draw(): void {
				const context = canvas.getContext("2d")
				if (!context || !image.complete || canvas.offsetWidth === 0) return
				// Device pixels per reference pixel.
				const k = canvas.width / canvas.offsetWidth
				// Slice edges in the sprite and on the canvas (whole device pixels: no seams).
				const sx = [0, left, width - right, width]
				const sy = [0, top, height - bottom, height]
				const dx = [0, Math.round(left * k), canvas.width - Math.round(right * k), canvas.width]
				const dy = [0, Math.round(top * k), canvas.height - Math.round(bottom * k), canvas.height]
				context.clearRect(0, 0, canvas.width, canvas.height)
				// A slice with no sprite pixels between its borders (e.g. `BlueAttackPanel`'s center)
				// still fills its space: Unity stretches the line of texels at the border.
				const span = (from: number, to: number, size: number) =>
					to > from ? [from, to - from] : [Math.min(from, size - 1), 1]
				for (let row = 0; row < 3; ++row)
					for (let column = 0; column < 3; ++column) {
						const [x, w] = span(sx[column]!, sx[column + 1]!, width)
						const [y, h] = span(sy[row]!, sy[row + 1]!, height)
						const [dX, dY, dW, dH] = [dx[column]!, dy[row]!, dx[column + 1]!, dy[row + 1]!]
						if (dW > dX && dH > dY)
							context.drawImage(image, x!, y!, w!, h!, dX, dY, dW - dX, dH - dY)
					}
			}

			const observer = new ResizeObserver(([entry]) => {
				const [size] = entry.devicePixelContentBoxSize
				canvas.width = size.inlineSize
				canvas.height = size.blockSize
				draw()
			})
			observer.observe(canvas, { box: "device-pixel-content-box" })
			const off = on(image, "load", draw)

			return () => {
				observer.disconnect()
				off()
			}
		}
	}
</script>

{#if type === "Sliced"}
	<canvas {@attach sliced(s)}></canvas>
{:else}
	<img alt="" src={s.src} />
{/if}

<style>
	canvas,
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
</style>
