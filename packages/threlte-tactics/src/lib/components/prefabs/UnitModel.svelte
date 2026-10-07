<!--
	Port of `Resources/Units/Hero.prefab` and `Resources/Units/Monster.prefab`, which only differ by
	the body's material.

	Hierarchy (as in Unity): root (placed on the board) → Jumper (animates the arc of a jump) →
	body sphere → two eyes (so you can tell which way the unit faces).
-->
<script lang="ts" module>
	import { Materials } from "#lib/materials/materials.ts"

	const bodies = { Hero: Materials.Ally, Monster: Materials.Enemy } as const

	export type UnitModelName = keyof typeof bodies
</script>

<script lang="ts">
	import { T, type Props } from "@threlte/core"
	import type { Group } from "three"

	let {
		model,
		jumper,
		...props
	}: Props<Group> & {
		model: UnitModelName
		/** Props for the `Jumper` child. */
		jumper?: Props<Group>
	} = $props()

	const eyes: { name: string; position: [number, number, number] }[] = [
		{ name: "Sphere", position: [0.17, 0.32, 0.3] },
		{ name: "Sphere 1", position: [-0.17, 0.32, 0.3] }
	]
</script>

<T.Group name={model} {...props}>
	<T.Group name="Jumper" {...jumper}>
		<T.Mesh name="Sphere" castShadow receiveShadow scale={0.8}>
			<T.SphereGeometry args={[0.5, 32, 16]} />
			<T.MeshStandardMaterial {...bodies[model]} />

			{#each eyes as eye (eye.name)}
				<T.Mesh name={eye.name} castShadow position={eye.position} receiveShadow scale={0.25}>
					<T.SphereGeometry args={[0.5, 32, 16]} />
					<T.MeshStandardMaterial {...Materials.Eyes} />
				</T.Mesh>
			{/each}
		</T.Mesh>
	</T.Group>
</T.Group>
