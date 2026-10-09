<!--
	Port of the `Battle.unity` scene: the 3D world (Threlte canvas) with the screen-space UI
	(DOM overlay) layered on top.
-->
<script lang="ts">
	import { Canvas } from "@threlte/core"
	import { onMount } from "svelte"
	import { LinearSRGBColorSpace, NoToneMapping, PCFShadowMap } from "three"
	import type { Random } from "#lib/common/Random.ts"
	import { Resources } from "#lib/common/Resources.ts"
	import { BattleController, setBattleController } from "#lib/controller/BattleController.svelte.ts"
	import AbilityMenuPanelControllerView from "./AbilityMenuPanelControllerView.svelte"
	import BattleMessageControllerView from "./BattleMessageControllerView.svelte"
	import HitSuccessIndicatorView from "./HitSuccessIndicatorView.svelte"
	import BattleScene from "./BattleScene.svelte"
	import ConversationControllerView from "./ConversationControllerView.svelte"
	import Input from "./Input.svelte"
	import Music from "./Music.svelte"
	import StatPanelControllerView from "./StatPanelControllerView.svelte"

	let {
		random,
		audio,
		onloadlevel
	}: {
		/** Unity's `UnityEngine.Random` (default: a new one). */
		random?: Random
		/** Unity's audio engine, to play the battle music on (default: no music). */
		audio?: BaseAudioContext
		/** Unity's `Application.LoadLevel(0)`: start the battle over, from scratch. */
		onloadlevel?: () => void
	} = $props()

	const levelData = Resources.load("Levels/Level_0")
	if (!levelData) throw new Error("Missing Resources/Levels/Level_0")

	// A scene is set up once, with the props it starts with; `{#key}` it to start over.
	// svelte-ignore state_referenced_locally
	const options = { random, loadLevel: () => onloadlevel?.() }
	const battle = setBattleController(new BattleController(levelData, options))
	onMount(() => battle.start())
</script>

<Input onfire={(button) => battle.fire(button)} onmove={(direction) => battle.move(direction)} />
{#if audio}
	<Music context={audio} />
{/if}

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
	<HitSuccessIndicatorView indicator={battle.hitSuccessIndicator} />
	<BattleMessageControllerView controller={battle.battleMessageController} />
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
