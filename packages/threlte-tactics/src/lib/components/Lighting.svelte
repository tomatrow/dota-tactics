<!--
	The scene's lighting: the `Directional Light` from `Battle.unity` plus an approximation of the
	ambient light Unity derives from its default skybox.

	Colors are raw gamma-space values (the canvas has color management off, like Unity's Gamma color
	space). Intensities are multiplied by π because three's lights are physically based, while
	Unity's Standard shader treats an intensity of 1 as "albedo × N·L".
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import { Quaternion, Vector3 } from "three"

	/** The Directional Light's rotation in `Battle.unity` (Euler 50, -30, 0). */
	const rotation = new Quaternion(0.40821794, -0.23456973, 0.109381676, 0.87542605)
	/** Directional lights shine down their local +Z in Unity. */
	const forward = new Vector3(0, 0, 1).applyQuaternion(rotation)
	/** three aims directional lights from their position at their target (the world origin). */
	const position = forward.clone().multiplyScalar(-20).toArray()

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
	Ambient light, tuned against footage of the Unity build: bluish from above (the sky), brighter and
	warmer from the sides (the horizon glow and the skybox's brown "ground").
-->
<T.AmbientLight color="#262626" intensity={Math.PI} />
<T.HemisphereLight args={["#26457a", "#73664d", Math.PI]} />
