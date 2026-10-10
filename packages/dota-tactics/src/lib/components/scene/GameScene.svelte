<!--
	Everything in the 3D view: the board from dota-tactics-grid (renderer, lights, terrain, water,
	trees, buildings, picking), and the game's camera and units on top.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { Color, type Group } from "three"
	import Entities from "dota-tactics-grid/components/scene/entities/Entities.svelte"
	import Lighting from "dota-tactics-grid/components/scene/Lighting.svelte"
	import Picker from "dota-tactics-grid/components/scene/Picker.svelte"
	import Renderer from "dota-tactics-grid/components/scene/Renderer.svelte"
	import Terrain from "dota-tactics-grid/components/scene/Terrain.svelte"
	import TileCursor from "dota-tactics-grid/components/scene/TileCursor.svelte"
	import Trees from "dota-tactics-grid/components/scene/Trees.svelte"
	import Water from "dota-tactics-grid/components/scene/Water.svelte"
	import { getGameState } from "#lib/game/GameState.svelte.ts"
	import GameCamera from "./GameCamera.svelte"
	import GameLoop from "./GameLoop.svelte"
	import Walker from "./Walker.svelte"

	/**
	 * An instance rather than `<T.Color>`: Threlte recognises classes by their source starting
	 * "class ", and minified base classes start "class{".
	 */
	const background = new Color(0x0b101c)

	const { view } = getGameState()

	let entities = $state.raw<Group>()
</script>

<GameLoop />
<GameCamera />
<Renderer dynamic />
<Picker entities={[entities].filter((group) => group !== undefined)} />

<T attach="background" is={background} />
<Lighting />

<T.Group name="ground" scale.y={view.verticalScale}>
	<Terrain />
	<Water />
</T.Group>
<Trees />
<Entities bind:major={entities} />

<TileCursor colour={0xffe39a} opacity={0.4} selection={view.hover} />

<Walker />
