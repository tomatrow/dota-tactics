<!--
	A unit's bars, facing the camera and drawn over the board: HP (team-coloured), MP for units that
	have it, and the ATB gauge. Updated each frame without touching Svelte state. Every part is
	transparent so all of them draw in three's transparent pass, in render order: backing, then
	fills.
-->
<script lang="ts">
	import { T, useTask } from "@threlte/core"
	import { Billboard } from "@threlte/extras"
	import type { Mesh } from "three"
	import { TEAM_COLOURS } from "dota-tactics-grid/scene/palette.ts"
	import { GAUGE_FULL } from "#lib/sim/constants.ts"
	import type { Unit } from "#lib/sim/unit.ts"

	let {
		unit,
		height,
		width = 1
	}: {
		unit: Unit
		/** How far (tiles) above the unit's feet. */
		height: number
		/** Bar length in tiles. */
		width?: number
	} = $props()

	const HP_HEIGHT = 0.12
	const MP_HEIGHT = 0.05
	const GAUGE_HEIGHT = 0.06
	const GAP = 0.02
	const PADDING = 0.04

	const rows = $derived(
		unit.stats.mp > 0 ?
			[
				{ key: "hp", height: HP_HEIGHT, colour: TEAM_COLOURS[unit.team] },
				{ key: "mp", height: MP_HEIGHT, colour: 0x6fa8ff },
				{ key: "gauge", height: GAUGE_HEIGHT, colour: 0xffe39a }
			]
		:	[
				{ key: "hp", height: HP_HEIGHT, colour: TEAM_COLOURS[unit.team] },
				{ key: "gauge", height: GAUGE_HEIGHT, colour: 0xffe39a }
			]
	)
	const total = $derived(rows.reduce((sum, row) => sum + row.height, 0) + GAP * (rows.length - 1))
	/** Each row's centre, top row first. */
	const centres = $derived.by(() => {
		let top = total / 2
		return rows.map((row) => {
			const centre = top - row.height / 2
			top -= row.height + GAP
			return centre
		})
	})

	const meshes: Record<string, Mesh | undefined> = $state({})

	/** Scales a fill bar from its left end. */
	function fill(mesh: Mesh | undefined, ratio: number) {
		if (!mesh) return
		const r = Math.max(0.0001, Math.min(1, ratio))
		mesh.scale.x = r
		mesh.position.x = (-width * (1 - r)) / 2
	}

	useTask(() => {
		fill(meshes.hp, unit.hp / unit.stats.hp)
		fill(meshes.mp, unit.mp / Math.max(1, unit.stats.mp))
		fill(meshes.gauge, unit.gauge / GAUGE_FULL)
	})
</script>

<Billboard position.y={height}>
	<T.Mesh renderOrder={20}>
		<T.PlaneGeometry args={[width + 0.06, total + 2 * PADDING]} />
		<T.MeshBasicMaterial
			color={0x0b101c}
			depthTest={false}
			opacity={0.8}
			toneMapped={false}
			transparent
		/>
	</T.Mesh>
	{#each rows as row, i (row.key)}
		<T.Mesh position.y={centres[i]} renderOrder={21} bind:ref={meshes[row.key]}>
			<T.PlaneGeometry args={[width, row.height]} />
			<T.MeshBasicMaterial color={row.colour} depthTest={false} toneMapped={false} transparent />
		</T.Mesh>
	{/each}
</Billboard>
