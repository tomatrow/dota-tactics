<!--
	What the board shows about orders: while an ability waits for its target, its reach as a diamond
	of tiles round the hero (FFT's blue range tiles); after an order, a green flash on the tile walked
	to, or a red ring on the unit attacked. Updated each frame.
-->
<script lang="ts">
	import { T, useTask } from "@threlte/core"
	import { Matrix4, type InstancedMesh, type Mesh, type MeshBasicMaterial } from "three"
	import { getGameState } from "#lib/game/GameState.svelte.ts"

	/** Most reach tiles drawn: reach 10's diamond. */
	const MAX_TILES = 221
	/** How long (real seconds) an order's mark lasts. */
	const MARK_TIME = 0.6

	const game = getGameState()
	const reach = $derived(game.targeting?.kind === "ability" ? game.targeting.ability.reach : 0)

	let tiles = $state.raw<InstancedMesh>()
	let moveMark = $state.raw<Mesh>()
	let moveMaterial = $state.raw<MeshBasicMaterial>()
	let attackMark = $state.raw<Mesh>()
	let attackMaterial = $state.raw<MeshBasicMaterial>()

	const matrix = new Matrix4()
	const flat = new Matrix4().makeRotationX(-Math.PI / 2)

	useTask(() => {
		const { hero, model } = game
		if (tiles) {
			let count = 0
			if (reach > 0 && hero.alive) {
				for (let dr = -reach; dr <= reach; dr++) {
					for (let dc = -reach; dc <= reach; dc++) {
						const col = hero.col + dc
						const row = hero.row + dr
						if (Math.abs(dc) + Math.abs(dr) > reach || count >= MAX_TILES) continue
						if (!model.inside(col, row) || model.walkable[model.index(col, row)] !== 1) continue
						const [x, y, z] = game.toScene(col, row)
						matrix.copy(flat).setPosition(x, y + 0.03, z)
						tiles.setMatrixAt(count++, matrix)
					}
				}
			}
			tiles.count = count
			tiles.instanceMatrix.needsUpdate = true
		}

		const mark = game.mark
		const fade = mark ? 1 - (performance.now() - mark.at) / 1000 / MARK_TIME : 0
		if (moveMark && moveMaterial) {
			moveMark.visible = mark?.kind === "move" && fade > 0
			if (mark && moveMark.visible) {
				const [x, y, z] = game.toScene(mark.col, mark.row)
				moveMark.position.set(x, y + 0.05, z)
				moveMark.scale.setScalar(0.6 + 0.4 * fade)
				moveMaterial.opacity = 0.8 * fade
			}
		}
		if (attackMark && attackMaterial) {
			attackMark.visible = mark?.kind === "attack" && fade > 0
			if (mark && attackMark.visible) {
				const [x, y, z] =
					mark.unit?.alive ? game.position(mark.unit) : game.toScene(mark.col, mark.row)
				const size = (mark.unit?.stats.radius ?? 0) + 0.6
				attackMark.position.set(x, y + 0.06, z)
				attackMark.scale.setScalar(size * (1.4 - 0.4 * fade))
				attackMaterial.opacity = fade
			}
		}
	})
</script>

<T.InstancedMesh
	args={[undefined, undefined, MAX_TILES]}
	frustumCulled={false}
	renderOrder={4}
	bind:ref={tiles}
>
	<T.PlaneGeometry args={[0.9, 0.9]} />
	<T.MeshBasicMaterial
		color={0x3d8bff}
		depthWrite={false}
		opacity={0.5}
		toneMapped={false}
		transparent
	/>
</T.InstancedMesh>

<T.Mesh renderOrder={6} rotation.x={-Math.PI / 2} visible={false} bind:ref={moveMark}>
	<T.RingGeometry args={[0.18, 0.45, 4, 1, Math.PI / 4]} />
	<T.MeshBasicMaterial
		color={0x7be08f}
		depthWrite={false}
		toneMapped={false}
		transparent
		bind:ref={moveMaterial}
	/>
</T.Mesh>

<T.Mesh renderOrder={6} rotation.x={-Math.PI / 2} visible={false} bind:ref={attackMark}>
	<T.RingGeometry args={[0.85, 1, 40]} />
	<T.MeshBasicMaterial
		color={0xff4a3a}
		depthWrite={false}
		toneMapped={false}
		transparent
		bind:ref={attackMaterial}
	/>
</T.Mesh>
