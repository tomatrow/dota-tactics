<!--
	A lane creep: a team-coloured body by kind (melee capsule, floating ranged sprite, siege box)
	with a nose showing its facing, a blob shadow, its bars, a lunge when it strikes in melee, a
	flash when it's hit, and a ring when it's selected.
-->
<script lang="ts">
	import { T, useTask } from "@threlte/core"
	import type { Group, MeshStandardMaterial } from "three"
	import { TEAM_COLOURS } from "dota-tactics-grid/scene/palette.ts"
	import { ATTACK_EFFECT, getGameState } from "#lib/game/GameState.svelte.ts"
	import { facingYaw, lunge } from "#lib/game/units.ts"
	import { TICK_RATE } from "#lib/sim/constants.ts"
	import type { Unit } from "#lib/sim/unit.ts"
	import Bars from "./Bars.svelte"

	let { unit }: { unit: Unit } = $props()

	/** How long (game seconds) a hit flashes. */
	const FLASH = 0.12

	const game = getGameState()
	const colour = $derived(TEAM_COLOURS[unit.team])
	const kind = $derived(unit.stats.kind)
	const melee = $derived(unit.stats.reach <= 2)

	let group = $state.raw<Group>()
	let body = $state.raw<Group>()
	let material = $state.raw<MeshStandardMaterial>()

	/** When the latest hit on this unit lands: at once in melee, at the end of a projectile's flight. */
	function flashing(time: number): boolean {
		for (const e of game.effects) {
			if (e.target !== unit || !e.hit) continue
			const lands = e.at + (e.attacker.stats.reach <= 2 ? 0.08 : ATTACK_EFFECT)
			if (time >= lands && time < lands + FLASH) return true
		}
		return false
	}

	useTask(() => {
		if (!group || !body) return
		group.position.set(...game.position(unit))
		group.rotation.y = facingYaw(unit.facing)
		const time = game.time
		body.position.z = melee && unit.lastAttack >= 0 ? -lunge(time - unit.lastAttack / TICK_RATE) : 0
		if (material) material.emissiveIntensity = flashing(time) ? 0.9 : 0
	})
</script>

<T.Group name="creep" bind:ref={group}>
	<T.Mesh position.y={0.02} renderOrder={2} rotation.x={-Math.PI / 2}>
		<T.CircleGeometry args={[0.45, 20]} />
		<T.MeshBasicMaterial color={0x000000} depthWrite={false} opacity={0.35} transparent />
	</T.Mesh>
	{#if game.selected === unit}
		<T.Mesh position.y={0.04} renderOrder={3} rotation.x={-Math.PI / 2}>
			<T.RingGeometry args={[0.48, 0.66, 32]} />
			<T.MeshBasicMaterial color={0xffe39a} depthWrite={false} toneMapped={false} transparent />
		</T.Mesh>
	{/if}

	<T.Group bind:ref={body}>
		{#if kind === "ranged"}
			<T.Mesh position.y={1}>
				<T.OctahedronGeometry args={[0.32]} />
				<T.MeshStandardMaterial
					color={colour}
					emissive={0xffffff}
					flatShading
					roughness={0.4}
					bind:ref={material}
				/>
			</T.Mesh>
		{:else if kind === "siege"}
			<T.Mesh position.y={0.4}>
				<T.BoxGeometry args={[0.85, 0.6, 1.1]} />
				<T.MeshStandardMaterial
					color={colour}
					emissive={0xffffff}
					roughness={0.7}
					bind:ref={material}
				/>
			</T.Mesh>
		{:else}
			<T.Mesh position.y={0.62}>
				<T.CapsuleGeometry args={[0.3, 0.5, 4, 10]} />
				<T.MeshStandardMaterial
					color={colour}
					emissive={0xffffff}
					roughness={0.6}
					bind:ref={material}
				/>
			</T.Mesh>
		{/if}
		<!-- The nose: the unit's front is −Z. -->
		<T.Mesh position={[0, kind === "ranged" ? 1 : 0.7, -0.34]} rotation.x={-Math.PI / 2}>
			<T.ConeGeometry args={[0.1, 0.24, 8]} />
			<T.MeshStandardMaterial color={0x2a2a2a} roughness={0.8} />
		</T.Mesh>
	</T.Group>

	<Bars height={kind === "ranged" ? 1.75 : 1.6} {unit} width={0.9} />
</T.Group>
