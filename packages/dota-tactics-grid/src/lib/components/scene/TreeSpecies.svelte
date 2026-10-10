<!--
	Every tree of one species as one instanced mesh. Trees keep their size when the height slider
	moves; only the ground they stand on moves.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import {
		Color,
		InstancedMesh,
		Matrix4,
		Quaternion,
		Vector3,
		type BufferGeometry,
		type Material
	} from "three"
	import { sceneY } from "#lib/scene/coords.ts"
	import type { TreePlacement } from "#lib/scene/trees.ts"
	import { getViewerState } from "#lib/state.svelte.ts"

	let {
		trees,
		geometry,
		material
	}: { trees: TreePlacement[]; geometry: BufferGeometry; material: Material } = $props()

	const view = getViewerState()
	const { model } = view

	let mesh = $state.raw<InstancedMesh>()

	$effect(() => {
		const instanced = mesh
		if (!instanced) return
		const colour = new Color()
		trees.forEach((tree, k) => instanced.setColorAt(k, colour.setScalar(tree.tint)))
		if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true
	})

	$effect(() => {
		const instanced = mesh
		if (!instanced) return
		const scale = view.verticalScale
		const m = new Matrix4()
		const q = new Quaternion()
		const up = new Vector3(0, 1, 0)
		const p = new Vector3()
		const s = new Vector3()
		trees.forEach((tree, k) => {
			p.set(tree.x, sceneY(model, tree.ground, scale), tree.z)
			q.setFromAxisAngle(up, tree.yaw)
			s.set(tree.width, tree.height, tree.width)
			instanced.setMatrixAt(k, m.compose(p, q, s))
		})
		instanced.instanceMatrix.needsUpdate = true
		instanced.computeBoundingSphere()
	})
</script>

<T.InstancedMesh
	args={[undefined, undefined, trees.length]}
	castShadow
	receiveShadow
	bind:ref={mesh}
>
	<T is={geometry} />
	<T is={material} />
</T.InstancedMesh>
