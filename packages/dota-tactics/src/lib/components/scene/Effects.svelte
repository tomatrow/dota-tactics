<!--
	Ranged attacks in flight: one instanced mesh of glowing bolts, from attacker to target over
	ATTACK_EFFECT game seconds. Siege shots lob; Sentinel bolts are bigger. Melee attacks have no
	projectile (the attacker lunges instead).
-->
<script lang="ts">
	import { T, useTask } from "@threlte/core"
	import { Color, Matrix4, type InstancedMesh } from "three"
	import { TEAM_COLOURS } from "dota-tactics-grid/scene/palette.ts"
	import { ATTACK_EFFECT, getGameState } from "#lib/game/GameState.svelte.ts"
	import { projectileAt } from "#lib/game/units.ts"
	import type { Unit } from "#lib/sim/unit.ts"

	/** Most bolts in flight at once. */
	const MAX = 256

	const game = getGameState()
	let mesh = $state.raw<InstancedMesh>()

	const matrix = new Matrix4()
	const colours = {
		radiant: new Color(TEAM_COLOURS.radiant).lerp(new Color(0xffffff), 0.5),
		dire: new Color(TEAM_COLOURS.dire).lerp(new Color(0xffffff), 0.5)
	}

	/** How high (tiles) above its feet a unit shoots from, or is hit at. */
	const muzzle = (unit: Unit) =>
		unit.stats.structure ? 3.2
		: unit.stats.kind === "ranged" ? 1
		: 0.7

	useTask(() => {
		if (!mesh) return
		const time = game.time
		let count = 0
		for (const effect of game.effects) {
			const { attacker, target } = effect
			if (attacker.stats.reach <= 2 || count >= MAX) continue
			const t = (time - effect.at) / ATTACK_EFFECT
			if (t < 0 || t > 1) continue
			const [ax, ay, az] = game.position(attacker)
			const [tx, ty, tz] = game.position(target)
			const arc = attacker.stats.kind === "siege" ? 1.5 : 0.3
			const at = projectileAt([ax, ay + muzzle(attacker), az], [tx, ty + 0.8, tz], t, arc)
			const size = attacker.stats.structure ? 0.28 : 0.16
			matrix.makeScale(size, size, size).setPosition(...at)
			mesh.setMatrixAt(count, matrix)
			mesh.setColorAt(count, colours[attacker.team])
			count++
		}
		mesh.count = count
		mesh.instanceMatrix.needsUpdate = true
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
	})
</script>

<T.InstancedMesh args={[undefined, undefined, MAX]} frustumCulled={false} bind:ref={mesh}>
	<T.SphereGeometry args={[1, 10, 8]} />
	<T.MeshBasicMaterial toneMapped={false} />
</T.InstancedMesh>
