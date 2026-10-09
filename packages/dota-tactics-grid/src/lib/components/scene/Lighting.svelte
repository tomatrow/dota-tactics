<!--
	The light: a warm sun from the west with soft shadows over the whole board, a cool sky fill, and
	a dim studio environment for highlights.
-->
<script lang="ts">
	import { T, useThrelte } from "@threlte/core"
	import { Environment } from "@threlte/extras"
	import { PMREMGenerator } from "three"
	import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"

	/** Half the side of the square the sun's shadows cover, in tiles: the whole board. */
	const SHADOW_EXTENT = 240

	const { renderer, scene } = useThrelte()

	const pmrem = new PMREMGenerator(renderer)
	const room = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
	pmrem.dispose()

	$effect(() => {
		scene.environmentIntensity = 0.22
		return () => {
			scene.environmentIntensity = 1
			room.dispose()
		}
	})
</script>

<Environment texture={room} />

<T.HemisphereLight color={0xd6e2ff} groundColor={0x3a3222} intensity={0.75} />

<!-- From the west and high: shadows fall east, to the right of things from the home view. -->
<T.DirectionalLight
	castShadow
	color={0xfff0d8}
	intensity={3.4}
	oncreate={(sun) => sun.shadow.camera.updateProjectionMatrix()}
	position={[-260, 380, 60]}
	shadow.bias={-0.0004}
	shadow.camera.bottom={-SHADOW_EXTENT}
	shadow.camera.far={1100}
	shadow.camera.left={-SHADOW_EXTENT}
	shadow.camera.near={50}
	shadow.camera.right={SHADOW_EXTENT}
	shadow.camera.top={SHADOW_EXTENT}
	shadow.mapSize={[4096, 4096]}
	shadow.normalBias={0.06}
	shadow.radius={2.5}
/>
