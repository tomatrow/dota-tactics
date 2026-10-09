<!--
	The 3D view, filling the window behind the UI.
-->
<script lang="ts">
	import { Canvas } from "@threlte/core"
	import { PCFShadowMap, WebGLRenderer } from "three"
	import Scene from "./scene/Scene.svelte"
</script>

<div aria-label="Isometric tactics grid of the Dota 2 map" role="application">
	<Canvas
		createRenderer={(canvas) => new WebGLRenderer({ canvas, powerPreference: "high-performance" })}
		dpr={[1, 2]}
		renderMode="always"
		shadows={PCFShadowMap}
	>
		<Scene />
	</Canvas>
</div>

<style>
	div {
		position: fixed;
		inset: 0;
		touch-action: none;
		overflow: hidden;
	}
	div :global(.labels) {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
</style>
