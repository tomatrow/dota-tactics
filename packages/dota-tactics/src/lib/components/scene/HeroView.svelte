<!--
	A hero: a Bangaa (a lizard with long ears, a snout and a tail) in team-coloured armour with a
	sword, a size up from the creeps. It turns smoothly to its facing, lunges when it strikes (further
	for Body Slam), flashes when hit, glows green when it heals, and has a blob shadow, its bars, and
	a ring when it's selected or under the pointer.
-->
<script lang="ts">
	import { T, useTask } from "@threlte/core"
	import {
		AdditiveBlending,
		DoubleSide,
		type Group,
		type Mesh,
		type MeshBasicMaterial,
		type MeshStandardMaterial
	} from "three"
	import { TEAM_COLOURS } from "dota-tactics-grid/scene/palette.ts"
	import { getGameState, HEAL_EFFECT } from "#lib/game/GameState.svelte.ts"
	import { facingYaw, lunge, turnToward } from "#lib/game/units.ts"
	import { TICK_RATE } from "#lib/sim/constants.ts"
	import type { Unit } from "#lib/sim/unit.ts"
	import Bars from "./Bars.svelte"
	import UnitRing from "./UnitRing.svelte"

	let { unit }: { unit: Unit } = $props()

	const SKIN = 0x8f9a5c
	const STEEL = 0xd2d6de
	const LEATHER = 0x5a3a24
	/** How fast (per second) the model swings to the facing the sim snaps to. */
	const TURN_RATE = 18

	const game = getGameState()
	const colour = $derived(TEAM_COLOURS[unit.team])

	let group = $state.raw<Group>()
	let body = $state.raw<Group>()
	let armour = $state.raw<MeshStandardMaterial>()
	let burst = $state.raw<Mesh>()
	let burstMaterial = $state.raw<MeshBasicMaterial>()
	let yaw: number | null = null

	useTask((delta) => {
		if (!group || !body) return
		group.position.set(...game.position(unit))
		const facing = facingYaw(unit.facing)
		yaw = yaw === null ? facing : turnToward(yaw, facing, 1 - Math.exp(-TURN_RATE * delta))
		group.rotation.y = yaw
		const time = game.time
		const slam = game.lastBlow(unit) === "bodySlam"
		const age = unit.lastAttack >= 0 ? time - unit.lastAttack / TICK_RATE : Infinity
		body.position.z = -lunge(age, slam ? 0.75 : 0.35)
		if (armour) armour.emissiveIntensity = game.flashing(unit) ? 0.9 : 0
		if (burst && burstMaterial) {
			const t = game.healAge(unit) / HEAL_EFFECT
			burst.visible = t < 1
			if (t < 1) {
				burst.scale.set(0.7 + t * 0.6, 0.4 + t * 1.2, 0.7 + t * 0.6)
				burstMaterial.opacity = 0.55 * (1 - t)
			}
		}
	})
</script>

<T.Group name="hero" bind:ref={group}>
	<T.Mesh position.y={0.02} renderOrder={2} rotation.x={-Math.PI / 2}>
		<T.CircleGeometry args={[0.55, 24]} />
		<T.MeshBasicMaterial color={0x000000} depthWrite={false} opacity={0.4} transparent />
	</T.Mesh>
	<UnitRing radius={0.6} {unit} width={0.2} />

	<T.Group bind:ref={body}>
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
				bind:ref={armour}
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
				<T.Mesh
					position={[side * 0.13, 0.12, 0.12]}
					rotation={[Math.PI / 2 - 0.35, 0, side * -0.35]}
				>
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
	</T.Group>

	<!-- A green glow rising round it when it heals. -->
	<T.Mesh position.y={0.8} renderOrder={5} visible={false} bind:ref={burst}>
		<T.CylinderGeometry args={[0.7, 0.7, 1.6, 24, 1, true]} />
		<T.MeshBasicMaterial
			blending={AdditiveBlending}
			color={0x6dff8f}
			depthWrite={false}
			side={DoubleSide}
			toneMapped={false}
			transparent
			bind:ref={burstMaterial}
		/>
	</T.Mesh>

	<Bars height={2.05} {unit} width={1.15} />
</T.Group>
