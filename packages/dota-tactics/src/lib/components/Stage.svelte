<!--
	The 3D view, filling the window behind the HUD.
-->
<script lang="ts">
	import { Canvas } from "@threlte/core"
	import { PCFShadowMap, WebGLRenderer } from "three"
	import GameScene from "./scene/GameScene.svelte"
</script>

<div
	aria-label="The Dota 2 map as a tactics board"
	oncontextmenu={(event) => event.preventDefault()}
	role="application"
>
	<!-- At most 1.5 device pixels per CSS pixel: SMAA keeps edges clean, and full retina costs too much
		fill rate with AO on. -->
	<Canvas
		createRenderer={(canvas) => new WebGLRenderer({ canvas, powerPreference: "high-performance" })}
		dpr={[1, 1.5]}
		renderMode="always"
		shadows={PCFShadowMap}
	>
		<GameScene />
	</Canvas>
</div>

<style>
	div {
		position: fixed;
		inset: 0;
		touch-action: none;
		overflow: hidden;
	}
</style>
