<!--
	A hero, a size up from the creeps: its job's body (a Bangaa Warrior, a Nu Mou Black Mage) in its
	team's colour. It turns smoothly to its facing, lunges when it strikes (further for Body Slam,
	less for a mage's spell), flashes when hit, goes ice blue while chilled, glows green when it
	heals, and has a blob shadow, its bars, and a ring when it's selected or under the pointer.
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
	import { facingYaw, lunge, tintBody, turnToward } from "#lib/game/units.ts"
	import { TICK_RATE } from "#lib/sim/constants.ts"
	import type { Unit } from "#lib/sim/unit.ts"
	import BangaaWarrior from "./BangaaWarrior.svelte"
	import Bars from "./Bars.svelte"
	import NuMouBlackMage from "./NuMouBlackMage.svelte"
	import UnitRing from "./UnitRing.svelte"

	let { unit }: { unit: Unit } = $props()

	/** How fast (per second) the model swings to the facing the sim snaps to. */
	const TURN_RATE = 18

	const game = getGameState()
	const colour = $derived(TEAM_COLOURS[unit.team])
	const job = $derived(unit.hero?.job.id ?? "warrior")

	let group = $state.raw<Group>()
	let body = $state.raw<Group>()
	let material = $state.raw<MeshStandardMaterial>()
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
		const age = unit.lastAttack >= 0 ? time - unit.lastAttack / TICK_RATE : Infinity
		const reach =
			job === "blackMage" ? 0.2
			: game.lastBlow(unit) === "bodySlam" ? 0.75
			: 0.35
		body.position.z = -lunge(age, reach)
		if (material) tintBody(material, game.flashing(unit), game.world.has(unit, "chill"))
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
		{#if job === "blackMage"}
			<NuMouBlackMage {colour} {unit} bind:material />
		{:else}
			<BangaaWarrior {colour} bind:material />
		{/if}
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
