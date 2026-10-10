<!--
	A Nu Mou Black Mage's body: short, in a flared team-coloured robe, long ears hanging from under a
	wide pointed straw hat, its face lost in the hat's shadow but for two yellow eyes, and the
	Firewheel Rod in its right hand, whose orb glows while a spell charges. Its front is −Z, its right
	hand +X; `material` is the robe's, for the hit flash.
-->
<script lang="ts">
	import { T, useTask } from "@threlte/core"
	import type { Mesh, MeshStandardMaterial } from "three"
	import { getGameState } from "#lib/game/GameState.svelte.ts"
	import type { Unit } from "#lib/sim/unit.ts"

	let {
		unit,
		colour,
		material = $bindable()
	}: {
		unit: Unit
		colour: number
		material?: MeshStandardMaterial
	} = $props()

	const FUR = 0xc9b48a
	const SHADOW = 0x17121f
	const STRAW = 0x9c7a44
	const WOOD = 0x5a3a24
	const EMBER = 0xff6a2a

	const game = getGameState()

	let orb = $state.raw<Mesh>()
	let orbMaterial = $state.raw<MeshStandardMaterial>()

	useTask(() => {
		if (!orb || !orbMaterial) return
		const casting = unit.casting !== null
		const pulse = casting ? 0.5 + 0.5 * Math.sin(game.time * 14) : 0
		orbMaterial.emissiveIntensity = casting ? 2 + 2 * pulse : 0.6
		orb.scale.setScalar(casting ? 1.3 + 0.25 * pulse : 1)
	})
</script>

<!-- Robe, flaring to the ground, and its collar. -->
<T.Mesh position.y={0.47}>
	<T.CylinderGeometry args={[0.2, 0.4, 0.9, 16]} />
	<T.MeshStandardMaterial color={colour} emissive={0xffffff} roughness={0.75} bind:ref={material} />
</T.Mesh>
<T.Mesh position.y={0.92}>
	<T.CylinderGeometry args={[0.23, 0.25, 0.08, 16]} />
	<T.MeshStandardMaterial color={STRAW} roughness={0.85} />
</T.Mesh>
<!-- Sleeves. -->
{#each [-1, 1] as side (side)}
	<T.Mesh position={[side * 0.27, 0.7, -0.06]} rotation={[-0.3, 0, side * 0.35]}>
		<T.CapsuleGeometry args={[0.08, 0.26, 4, 8]} />
		<T.MeshStandardMaterial color={colour} roughness={0.75} />
	</T.Mesh>
{/each}
<!-- Head: in shadow, a short Nu Mou muzzle, glowing eyes, long ears hanging to the shoulders. -->
<T.Group position.y={1.1}>
	<T.Mesh>
		<T.SphereGeometry args={[0.19, 16, 12]} />
		<T.MeshStandardMaterial color={SHADOW} roughness={0.95} />
	</T.Mesh>
	<T.Mesh position={[0, -0.07, -0.15]}>
		<T.SphereGeometry args={[0.1, 12, 8]} />
		<T.MeshStandardMaterial color={SHADOW} roughness={0.95} />
	</T.Mesh>
	{#each [-1, 1] as side (side)}
		<T.Mesh position={[side * 0.075, 0.03, -0.17]}>
			<T.SphereGeometry args={[0.035, 8, 6]} />
			<T.MeshBasicMaterial color={0xffd84a} toneMapped={false} />
		</T.Mesh>
		<T.Mesh position={[side * 0.2, -0.12, 0.02]} rotation.z={side * 0.22}>
			<T.CapsuleGeometry args={[0.055, 0.36, 4, 8]} />
			<T.MeshStandardMaterial color={FUR} roughness={0.8} />
		</T.Mesh>
	{/each}
	<!-- The hat: a wide brim, and a tall crown bent back. -->
	<T.Mesh position.y={0.15}>
		<T.CylinderGeometry args={[0.4, 0.43, 0.03, 24]} />
		<T.MeshStandardMaterial color={STRAW} roughness={0.85} />
	</T.Mesh>
	<T.Mesh position={[0, 0.44, 0.05]} rotation.x={0.22}>
		<T.ConeGeometry args={[0.23, 0.6, 16]} />
		<T.MeshStandardMaterial color={STRAW} roughness={0.85} />
	</T.Mesh>
</T.Group>
<!-- The Firewheel Rod in the right hand (+X), held upright. -->
<T.Group position={[0.36, 0.62, -0.14]} rotation.x={-0.2}>
	<T.Mesh position.y={0.28}>
		<T.CylinderGeometry args={[0.025, 0.025, 0.95, 8]} />
		<T.MeshStandardMaterial color={WOOD} roughness={0.8} />
	</T.Mesh>
	<T.Mesh position.y={0.8} bind:ref={orb}>
		<T.SphereGeometry args={[0.08, 12, 10]} />
		<T.MeshStandardMaterial
			color={EMBER}
			emissive={EMBER}
			roughness={0.3}
			toneMapped={false}
			bind:ref={orbMaterial}
		/>
	</T.Mesh>
</T.Group>
