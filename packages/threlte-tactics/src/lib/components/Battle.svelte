<!--
	Port of the `Battle.unity` scene: the 3D world (Threlte canvas) with the screen-space UI
	(DOM overlay) layered on top.
-->
<script lang="ts">
	import { Canvas } from "@threlte/core"
</script>

<div>
	<Canvas renderMode="on-demand">
		<!-- Scene content arrives with the tutorial parts. -->
	</Canvas>
</div>

<style>
	div {
		position: fixed;
		inset: 0;
	}
</style>
