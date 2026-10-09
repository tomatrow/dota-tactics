import type { WebGLRenderer, WebGLRenderTarget } from "three"
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js"

/**
 * Ground-truth AO that re-renders its normal/depth G-buffer (a second full render of the scene)
 * only when something changed. The board is static apart from a few spinning crystals, so when
 * the camera is still the previous G-buffer is reused and only the cheap AO passes run.
 *
 * This drives `_renderGBuffer`, the flag three's GTAOPass uses itself when given an external
 * G-buffer (`setGBuffer`). It's internal, so check it when bumping three.
 */
export class CachedGTAOPass extends GTAOPass {
	/** Set when the camera or the scene's shapes changed; cleared after the next render. */
	refresh = true

	override render(
		renderer: WebGLRenderer,
		writeBuffer: WebGLRenderTarget,
		readBuffer: WebGLRenderTarget,
		deltaTime: number,
		maskActive: boolean
	) {
		;(this as unknown as { _renderGBuffer: boolean })._renderGBuffer = this.refresh
		this.refresh = false
		super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive)
	}
}
