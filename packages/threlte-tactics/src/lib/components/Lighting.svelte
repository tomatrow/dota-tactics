<!--
	The scene's lighting: the `Directional Light` from `Battle.unity`, plus ambient light that
	approximates what Unity derives from its default skybox.

	Colors are raw gamma-space values (the canvas has color management off, like Unity's Gamma color
	space). Intensities are multiplied by π because three's lights are physically based, while
	Unity's Standard shader treats an intensity of 1 as "albedo × N·L".
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { Euler, MathUtils, Vector3 } from "three"

	const { degToRad } = MathUtils

	/** Where the sun shines: 50° downwards, towards the north-north-west. */
	const direction = new Vector3(0, 0, -1).applyEuler(
		new Euler(degToRad(-50), degToRad(30), 0, "YXZ")
	)
	/** three aims directional lights from their position at their target (the world origin). */
	const position = direction.clone().multiplyScalar(-20).toArray()

	const shadowExtent = 15
</script>

<T.DirectionalLight
	name="Directional Light"
	castShadow
	color="#fff4d6"
	intensity={Math.PI}
	{position}
	shadow.bias={-0.0005}
	shadow.camera.bottom={-shadowExtent}
	shadow.camera.far={50}
	shadow.camera.left={-shadowExtent}
	shadow.camera.right={shadowExtent}
	shadow.camera.top={shadowExtent}
	shadow.mapSize={[2048, 2048]}
	shadow.normalBias={0.02}
/>

<!--
	Ambient light: bluish from above (the sky), brighter and warmer from the sides (the horizon glow
	and the skybox's brown "ground").
-->
<T.AmbientLight color="#262626" intensity={Math.PI} />
<T.HemisphereLight args={["#26457a", "#73664d", Math.PI]} />
