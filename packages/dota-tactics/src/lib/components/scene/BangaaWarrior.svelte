<!--
	A Bangaa Warrior's body: a lizard with long ears, a snout and a tail, in team-coloured armour
	with a sword. Its front is −Z, its right hand +X; `material` is the armour's, for the hit flash.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { MeshStandardMaterial } from "three"

	let {
		colour,
		material = $bindable()
	}: {
		colour: number
		material?: MeshStandardMaterial
	} = $props()

	const SKIN = 0x8f9a5c
	const STEEL = 0xd2d6de
	const LEATHER = 0x5a3a24
</script>

<!-- Legs. -->
{#each [-0.15, 0.15] as x (x)}
	<T.Mesh position={[x, 0.24, 0]}>
		<T.CapsuleGeometry args={[0.1, 0.22, 4, 8]} />
		<T.MeshStandardMaterial color={SKIN} roughness={0.8} />
	</T.Mesh>
{/each}
<!-- Armoured torso. -->
<T.Mesh position.y={0.78}>
	<T.CapsuleGeometry args={[0.32, 0.46, 4, 12]} />
	<T.MeshStandardMaterial
		color={colour}
		emissive={0xffffff}
		metalness={0.2}
		roughness={0.5}
		bind:ref={material}
	/>
</T.Mesh>
<!-- Belt. -->
<T.Mesh position.y={0.62}>
	<T.CylinderGeometry args={[0.33, 0.33, 0.08, 16]} />
	<T.MeshStandardMaterial color={LEATHER} roughness={0.9} />
</T.Mesh>
<!-- Tail: from the hips, back (+Z) and down. -->
<T.Mesh position={[0, 0.42, 0.42]} rotation.x={Math.PI / 2 + 0.45}>
	<T.ConeGeometry args={[0.12, 0.75, 10]} />
	<T.MeshStandardMaterial color={SKIN} roughness={0.8} />
</T.Mesh>
<!-- Head: skull, snout forward (−Z), long ears swept back. -->
<T.Group position.y={1.4}>
	<T.Mesh>
		<T.SphereGeometry args={[0.22, 16, 12]} />
		<T.MeshStandardMaterial color={SKIN} roughness={0.7} />
	</T.Mesh>
	<T.Mesh position={[0, -0.05, -0.24]}>
		<T.BoxGeometry args={[0.2, 0.15, 0.3]} />
		<T.MeshStandardMaterial color={SKIN} roughness={0.7} />
	</T.Mesh>
	{#each [-1, 1] as side (side)}
		<T.Mesh position={[side * 0.13, 0.12, 0.12]} rotation={[Math.PI / 2 - 0.35, 0, side * -0.35]}>
			<T.ConeGeometry args={[0.05, 0.42, 8]} />
			<T.MeshStandardMaterial color={SKIN} roughness={0.7} />
		</T.Mesh>
		<T.Mesh position={[side * 0.1, 0.03, -0.17]}>
			<T.SphereGeometry args={[0.035, 8, 6]} />
			<T.MeshBasicMaterial color={0xffd25a} />
		</T.Mesh>
	{/each}
</T.Group>
<!-- Sword in the right hand (+X), angled forward and up. -->
<T.Group position={[0.42, 0.78, -0.08]} rotation.x={-0.9}>
	<T.Mesh position.y={0.46}>
		<T.BoxGeometry args={[0.06, 0.78, 0.12]} />
		<T.MeshStandardMaterial color={STEEL} metalness={0.8} roughness={0.25} />
	</T.Mesh>
	<T.Mesh position.y={0.06}>
		<T.BoxGeometry args={[0.07, 0.06, 0.3]} />
		<T.MeshStandardMaterial color={LEATHER} roughness={0.8} />
	</T.Mesh>
</T.Group>
