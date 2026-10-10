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
	<Canvas
		createRenderer={(canvas) => new WebGLRenderer({ canvas, powerPreference: "high-performance" })}
		dpr={[1, 2]}
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
