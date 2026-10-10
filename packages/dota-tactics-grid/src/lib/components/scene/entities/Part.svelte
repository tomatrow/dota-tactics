<!--
	One part of an entity model: its geometry (the children) with the shared material for its look,
	optionally spinning about its vertical axis or bobbing up and down.
-->
<script lang="ts">
	import { T, useTask } from "@threlte/core"
	import type { Snippet } from "svelte"
	import type { Mesh } from "three"
	import { getMaterials, type Look } from "#lib/scene/palette.ts"

	type V3 = [number, number, number]

	let {
		look,
		at = [0, 0, 0],
		rotate = [0, 0, 0],
		scale = [1, 1, 1],
		spin = 0,
		bob = false,
		shadow = true,
		children
	}: {
		look: Look
		at?: V3
		rotate?: V3
		scale?: V3
		/** Radians per second about the part's own Y axis. */
		spin?: number
		bob?: boolean
		/** Whether it casts a shadow. */
		shadow?: boolean
		children: Snippet
	} = $props()

	const materials = getMaterials()
	const material = $derived(materials.get(look))
	const translucent = $derived(typeof look !== "number" && look.opacity !== undefined)

	let mesh = $state.raw<Mesh>()
	let elapsed = 0
	useTask(
		(delta) => {
			if (!mesh) return
			elapsed += delta
			if (spin) mesh.rotation.y += spin * Math.min(0.1, delta)
			if (bob) mesh.position.y = at[1] + Math.sin(elapsed * 2 + mesh.id) * 0.15
		},
		{ running: () => spin !== 0 || bob, autoInvalidate: false }
	)
</script>

<T.Mesh
	castShadow={shadow}
	oncreate={(ref) => {
		// See-through areas (Roshan's pit, portals) leave the pointer to the tiles below.
		if (translucent) ref.raycast = () => undefined
	}}
	position={at}
	receiveShadow
	rotation={rotate}
	{scale}
	bind:ref={mesh}
>
	{@render children()}
	<T is={material} />
</T.Mesh>
