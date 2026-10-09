<!--
	Draws each frame through the post-processing chain: the scene, ground-truth AO, SMAA, then tone
	mapping and colour output. The board is static, so the shadow map and the AO's normal/depth
	G-buffer are only re-rendered when the camera moves or the scene's shapes change.
-->
<script lang="ts">
	import { useTask, useThrelte } from "@threlte/core"
	import { HalfFloatType, Matrix4, WebGLRenderTarget } from "three"
	import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
	import { OutputPass } from "three/addons/postprocessing/OutputPass.js"
	import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
	import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js"
	import { CachedGTAOPass } from "#lib/scene/ao.ts"
	import { getViewerState } from "#lib/state.svelte.ts"

	/** Ambient occlusion is soft and low-frequency: computing it at half resolution halves its cost. */
	const AO_SCALE = 0.5

	const view = getViewerState()
	const { renderer, scene, camera, size, dpr, autoRender, renderStage } = useThrelte()

	renderer.toneMappingExposure = 1.2
	renderer.shadowMap.autoUpdate = false

	/** Set when shapes in the scene changed: shadows and the AO G-buffer need re-rendering. */
	let shapesChanged = true
	const lastView = new Matrix4()
	const lastProjection = new Matrix4()

	// GTAO bakes the camera's kind into its shaders, so the chain is built for the current camera.
	// SMAA rather than MSAA: GTAO's full-screen passes into multisampled buffers cost ~15 ms a frame
	// at retina sizes; SMAA costs ~2 ms and looks the same on flat-shaded geometry.
	const chain = $derived.by(() => {
		const composer = new EffectComposer(
			renderer,
			new WebGLRenderTarget(1, 1, { type: HalfFloatType })
		)
		composer.addPass(new RenderPass(scene, $camera))
		const gtao = new CachedGTAOPass(scene, $camera, 1, 1)
		gtao.updateGtaoMaterial({
			radius: 2.5,
			distanceExponent: 1.5,
			thickness: 4,
			scale: 1.1,
			samples: 16
		})
		gtao.blendIntensity = 0.9
		composer.addPass(gtao)
		composer.addPass(new SMAAPass())
		composer.addPass(new OutputPass())
		return { composer, gtao }
	})

	$effect(() => {
		const { composer, gtao } = chain
		return () => {
			gtao.dispose()
			composer.dispose()
		}
	})

	$effect(() => {
		const { composer, gtao } = chain
		const { width, height } = $size
		composer.setPixelRatio($dpr)
		composer.setSize(width, height)
		gtao.setSize(Math.round(width * $dpr * AO_SCALE), Math.round(height * $dpr * AO_SCALE))
		shapesChanged = true
	})

	$effect(() => {
		chain.gtao.enabled = view.visibility.ao
	})

	// What changes the shapes the shadow map and the AO G-buffer see.
	$effect(() => {
		void $state.snapshot(view.visibility)
		void view.verticalScale
		void view.layer
		shapesChanged = true
	})

	$effect(() => {
		const last = autoRender.current
		autoRender.set(false)
		return () => autoRender.set(last)
	})

	useTask(
		(delta) => {
			const { composer, gtao } = chain
			// Rendering would update this anyway; do it now so this frame sees this frame's camera.
			camera.current.updateMatrixWorld()
			const { matrixWorld, projectionMatrix } = camera.current
			const moved = !lastView.equals(matrixWorld) || !lastProjection.equals(projectionMatrix)
			if (moved) {
				lastView.copy(matrixWorld)
				lastProjection.copy(projectionMatrix)
			}
			if (moved || shapesChanged) gtao.refresh = true
			if (shapesChanged) renderer.shadowMap.needsUpdate = true
			shapesChanged = false
			composer.render(delta)
		},
		{ stage: renderStage, autoInvalidate: false }
	)
</script>
