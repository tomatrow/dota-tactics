<!--
	Port of the `Battle.unity` scene: the 3D world (Threlte canvas) with the screen-space UI
	(DOM overlay) layered on top.
-->
<script lang="ts">
	import { page } from "$app/state"
	import { Canvas } from "@threlte/core"
	import { onMount } from "svelte"
	import { LinearSRGBColorSpace, NoToneMapping, PCFShadowMap } from "three"
	import { Resources } from "#lib/common/unity/Resources.ts"
	import { BattleController, setBattleController } from "#lib/controller/BattleController.svelte.ts"
	import type { LevelData } from "#lib/model/LevelData.ts"
	import AbilityMenuPanelControllerView from "./AbilityMenuPanelControllerView.svelte"
	import BattleScene from "./BattleScene.svelte"
	import ConversationControllerView from "./ConversationControllerView.svelte"
	import Input from "./Input.svelte"
	import StatPanelControllerView from "./StatPanelControllerView.svelte"

	const levelData = Resources.load<LevelData>("Levels/Level_0")
	if (!levelData) throw new Error("Missing Resources/Levels/Level_0")

	// `?seed=` replays a battle's randomness.
	const seed = page.url.searchParams.get("seed")
	const battle = setBattleController(
		new BattleController(levelData, seed === null ? {} : { seed: Number(seed) })
	)
	console.info(`Battle seed: ${battle.random.seed} (replay with ?seed=${battle.random.seed})`)
	onMount(() => battle.start())
</script>

<Input onfire={(button) => battle.fire(button)} onmove={(direction) => battle.move(direction)} />

<div>
	<!--
		The Unity project renders in Gamma color space with no tone mapping. Turning three's color
		management off and writing the result untouched (linear output) reproduces that: colors and
		textures are used as authored and lighting happens in gamma space.
	-->
	<Canvas
		colorManagementEnabled={false}
		colorSpace={LinearSRGBColorSpace}
		renderMode="on-demand"
		shadows={PCFShadowMap}
		toneMapping={NoToneMapping}
	>
		<BattleScene />
	</Canvas>
	<!-- The UI prefabs, in `Battle.unity`'s order (later canvases draw on top). -->
	<ConversationControllerView controller={battle.conversationController} />
	<AbilityMenuPanelControllerView controller={battle.abilityMenuPanelController} />
	<StatPanelControllerView controller={battle.statPanelController} />
</div>

<style>
	div {
		position: fixed;
		inset: 0;
		/*
			Unity's default procedural skybox as the orthographic battle camera sees it: a sliver of
			sky above the horizon glow, then the gray "ground" half. Sampled from footage of the
			Unity build.
		*/
		background: linear-gradient(
			rgb(150 180 208) 0%,
			rgb(174 204 232) 6.7%,
			rgb(205 241 253) 11%,
			rgb(224 251 255) 13.3%,
			rgb(221 253 250) 15.5%,
			rgb(172 174 173) 17.8%,
			rgb(102 102 102) 20%,
			rgb(100 100 100) 100%
		);
	}
</style>
