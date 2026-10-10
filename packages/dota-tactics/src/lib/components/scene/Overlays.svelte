<!--
	What the board shows about orders and spells, as FFT's coloured tiles: while an ability waits for
	its target, its reach as a blue diamond round the hero, and for a tile ability the area it would
	hit, in orange, round the tile or enemy under the pointer; while any hero charges a spell, the
	area it will land on, pulsing red, for everyone to see. After an order, a green flash on the tile
	walked to, or a red ring on the unit attacked. Updated each frame.
-->
<script lang="ts">
	import { T, useTask } from "@threlte/core"
	import { Matrix4, type InstancedMesh, type Mesh, type MeshBasicMaterial } from "three"
	import { getGameState } from "#lib/game/GameState.svelte.ts"

	/** Most reach tiles drawn: reach 10's diamond. */
	const MAX_TILES = 221
	/** Most area tiles drawn, per layer: a few radius-3 areas. */
	const MAX_AREA = 100
	/** How long (real seconds) an order's mark lasts. */
	const MARK_TIME = 0.6

	const game = getGameState()
	const ability = $derived(game.targeting?.kind === "ability" ? game.targeting.ability : null)

	let tiles = $state.raw<InstancedMesh>()
	let aimTiles = $state.raw<InstancedMesh>()
	let chargeTiles = $state.raw<InstancedMesh>()
	let chargeMaterial = $state.raw<MeshBasicMaterial>()
	let moveMark = $state.raw<Mesh>()
	let moveMaterial = $state.raw<MeshBasicMaterial>()
	let attackMark = $state.raw<Mesh>()
	let attackMaterial = $state.raw<MeshBasicMaterial>()

	const matrix = new Matrix4()
	const flat = new Matrix4().makeRotationX(-Math.PI / 2)

	/**
	 * Lays tiles of a diamond, `radius` round (col, row), into an instanced mesh from `count` on;
	 * `walkable` skips tiles nobody can stand on. Returns the new count.
	 */
	function diamond(
		mesh: InstancedMesh,
		count: number,
		max: number,
		[col, row]: readonly [number, number],
		radius: number,
		lift: number,
		walkable: boolean
	): number {
		const { model } = game
		for (let dr = -radius; dr <= radius; dr++) {
			for (let dc = -radius; dc <= radius; dc++) {
				const c = col + dc
				const r = row + dr
				if (Math.abs(dc) + Math.abs(dr) > radius || count >= max || !model.inside(c, r)) continue
				if (walkable && model.walkable[model.index(c, r)] !== 1) continue
				const [x, y, z] = game.toScene(c, r)
				matrix.copy(flat).setPosition(x, y + lift, z)
				mesh.setMatrixAt(count++, matrix)
			}
		}
		return count
	}

	function finish(mesh: InstancedMesh, count: number) {
		mesh.count = count
		mesh.instanceMatrix.needsUpdate = true
	}

	useTask(() => {
		const { hero, world } = game
		const aiming = ability && ability.target !== "self" && hero.alive ? ability : null
		if (tiles) {
			const count =
				aiming ? diamond(tiles, 0, MAX_TILES, [hero.col, hero.row], aiming.reach, 0.03, true) : 0
			finish(tiles, count)
		}
		if (aimTiles) {
			const aim = aiming?.target === "tile" ? game.aim : null
			finish(
				aimTiles,
				aim ? diamond(aimTiles, 0, MAX_AREA, aim, aiming?.area ?? 0, 0.04, false) : 0
			)
		}
		if (chargeTiles && chargeMaterial) {
			let count = 0
			for (const unit of world.heroes) {
				const casting = unit.alive ? unit.casting : null
				if (!casting) continue
				const at = [casting.col, casting.row] as const
				count = diamond(chargeTiles, count, MAX_AREA, at, casting.ability.area, 0.05, false)
			}
			finish(chargeTiles, count)
			chargeMaterial.opacity = 0.55 + 0.2 * Math.sin(game.time * 10)
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

<T.InstancedMesh
	args={[undefined, undefined, MAX_AREA]}
	frustumCulled={false}
	renderOrder={5}
	bind:ref={aimTiles}
>
	<T.PlaneGeometry args={[0.9, 0.9]} />
	<T.MeshBasicMaterial
		color={0xff8c1a}
		depthWrite={false}
		opacity={0.8}
		toneMapped={false}
		transparent
	/>
</T.InstancedMesh>

<T.InstancedMesh
	args={[undefined, undefined, MAX_AREA]}
	frustumCulled={false}
	renderOrder={5}
	bind:ref={chargeTiles}
>
	<T.PlaneGeometry args={[0.9, 0.9]} />
	<T.MeshBasicMaterial
		color={0xff2a1a}
		depthWrite={false}
		toneMapped={false}
		transparent
		bind:ref={chargeMaterial}
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
