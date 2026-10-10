<!--
	Spells landing, for SPELL_EFFECT game seconds: Fire and Fira as tongues of flame rising and dying
	on every tile of their area (three a tile, staggered), Blizzard as ice shards falling on the
	target and melting. Two instanced meshes, updated each frame: the flames see-through (additive
	washes out to white on the light ground), the ice additive. On the first frame each draws one
	empty instance, so their shaders compile with the board, not in the frame of the first spell
	(it took a 100 ms frame on a busy machine).
-->
<script lang="ts">
	import { T, useTask } from "@threlte/core"
	import { AdditiveBlending, Color, Matrix4, Quaternion, Vector3, type InstancedMesh } from "three"
	import { getGameState, SPELL_EFFECT } from "#lib/game/GameState.svelte.ts"

	/** Tongues of flame per tile. */
	const TONGUES = 3
	/** Most tongues at once: three Firas' areas. */
	const MAX_FLAMES = 256
	const MAX_SHARDS = 48
	const SHARDS = 6
	/** The share of the effect ice takes to fall. */
	const FALL = 0.35

	const game = getGameState()
	let flames = $state.raw<InstancedMesh>()
	let shards = $state.raw<InstancedMesh>()

	const matrix = new Matrix4()
	const position = new Vector3()
	const scale = new Vector3()
	const rotation = new Quaternion()
	const up = new Vector3(0, 1, 0)
	const colour = new Color()
	/** A tongue's colour from its start to its end, the first tongue of a tile hottest. */
	const HOT = new Color(0xffc23a)
	const FLAME = new Color(0xff5a14)
	const EMBER = new Color(0x9a1c06)
	const ICE = new Color(0xbfe8ff)

	let warm = false

	/** A number 0–1 fixed for a tile (and `k`): so flames and shards differ from place to place. */
	const jitter = (col: number, row: number, k = 0) =>
		(((col * 73856093) ^ (row * 19349663) ^ (k * 83492791)) >>> 0) / 0xffffffff

	useTask(() => {
		if (!flames || !shards) return
		if (!warm) {
			warm = true
			for (const mesh of [flames, shards]) {
				mesh.setMatrixAt(0, matrix.makeScale(0, 0, 0))
				mesh.setColorAt(0, colour.set(0xffffff))
				mesh.count = 1
			}
			return
		}
		const { model } = game
		const time = game.time
		let f = 0
		let s = 0
		for (const spell of game.spells) {
			const t = (time - spell.at) / SPELL_EFFECT
			if (t < 0 || t > 1) continue
			if (spell.ability.id === "blizzard") {
				const [x, y, z] = game.toScene(spell.col, spell.row)
				const fall = Math.min(1, t / FALL)
				const size = 0.24 * (t < FALL ? 1 : 1 - (t - FALL) / (1 - FALL))
				for (let k = 0; k < SHARDS && s < MAX_SHARDS; k++) {
					const angle = (k / SHARDS) * Math.PI * 2 + jitter(spell.col, spell.row, k)
					const spread = 0.15 + 0.25 * jitter(spell.col, spell.row, k + SHARDS)
					position.set(
						x + Math.cos(angle) * spread,
						y + 0.25 + (2.6 + k * 0.15) * (1 - fall),
						z + Math.sin(angle) * spread
					)
					rotation.setFromAxisAngle(up, angle + t * 3)
					scale.set(size * 0.55, size * 1.6, size * 0.55)
					shards.setMatrixAt(s, matrix.compose(position, rotation, scale))
					shards.setColorAt(s, colour.copy(ICE).multiplyScalar(1 - 0.5 * t))
					s++
				}
				continue
			}
			const { area } = spell.ability
			const tall = area >= 3 ? 1.5 : 1.15
			rotation.identity()
			for (let dr = -area; dr <= area; dr++) {
				for (let dc = -area; dc <= area; dc++) {
					const col = spell.col + dc
					const row = spell.row + dr
					if (Math.abs(dc) + Math.abs(dr) > area || !model.inside(col, row)) continue
					const [x, y, z] = game.toScene(col, row)
					for (let n = 0; n < TONGUES && f < MAX_FLAMES; n++) {
						const j = jitter(col, row, n)
						const delay = 0.2 * j
						const k = Math.max(0, (t - delay) / (1 - delay))
						const grow = Math.sin(Math.PI * Math.min(1, k))
						const height = Math.max(0.001, tall * (n === 0 ? 1 : 0.55 + 0.3 * j) * grow)
						const angle = (n / TONGUES) * Math.PI * 2 + 6 * j
						const off = n === 0 ? 0 : 0.2
						position.set(x + Math.cos(angle) * off, y + height / 2, z + Math.sin(angle) * off)
						const width = (n === 0 ? 0.24 : 0.17) * (0.6 + 0.4 * grow)
						scale.set(width, height, width)
						flames.setMatrixAt(f, matrix.compose(position, rotation, scale))
						colour.copy(n === 0 ? HOT : FLAME).lerp(EMBER, k * k)
						flames.setColorAt(f, colour)
						f++
					}
				}
			}
		}
		for (const [mesh, count] of [
			[flames, f],
			[shards, s]
		] as const) {
			mesh.count = count
			mesh.instanceMatrix.needsUpdate = true
			if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
		}
	})
</script>

<T.InstancedMesh
	args={[undefined, undefined, MAX_FLAMES]}
	frustumCulled={false}
	renderOrder={7}
	bind:ref={flames}
>
	<T.ConeGeometry args={[1, 1, 10]} />
	<T.MeshBasicMaterial depthWrite={false} opacity={0.9} toneMapped={false} transparent />
</T.InstancedMesh>

<T.InstancedMesh
	args={[undefined, undefined, MAX_SHARDS]}
	frustumCulled={false}
	renderOrder={7}
	bind:ref={shards}
>
	<T.OctahedronGeometry args={[1]} />
	<T.MeshBasicMaterial
		blending={AdditiveBlending}
		depthWrite={false}
		toneMapped={false}
		transparent
	/>
</T.InstancedMesh>
