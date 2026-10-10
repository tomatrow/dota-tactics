<!--
	Everything in the 3D view: the board from dota-tactics-grid (renderer, lights, terrain, water,
	trees, buildings, tile picking), and the game's camera, mouse input, units and effects on top.
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
	import GameInput from "./GameInput.svelte"
	import GameLoop from "./GameLoop.svelte"
	import Units from "./Units.svelte"

	/**
	 * An instance rather than `<T.Color>`: Threlte recognises classes by their source starting
	 * "class ", and minified base classes start "class{".
	 */
	const background = new Color(0x0b101c)

	const game = getGameState()
	const { view } = game

	let entities = $state.raw<Group>()
</script>

<GameLoop />
<GameCamera />
<!-- Close up, AO's radius spans many pixels: a quarter resolution and 8 samples look the same and
	cost far less. -->
<Renderer aoSamples={8} aoScale={0.25} dynamic />
<Picker entities={[entities].filter((group) => group !== undefined)} />
<GameInput />

<T attach="background" is={background} />
<Lighting />

<T.Group name="ground" scale.y={view.verticalScale}>
	<Terrain />
	<Water />
</T.Group>
<Trees />
<Entities hidden={game.fallen} bind:major={entities} />

<TileCursor colour={0xffe39a} opacity={0.4} selection={view.hover} />

<Units />
