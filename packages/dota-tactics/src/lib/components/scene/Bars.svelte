<!--
	A unit's HP bar (team-coloured) with its ATB gauge underneath, facing the camera and drawn over
	the board. Updated each frame without touching Svelte state. Every part is transparent so all
	of them draw in three's transparent pass, in render order: backing, then fills.
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
	const GAUGE_HEIGHT = 0.06

	let hp = $state.raw<Mesh>()
	let gauge = $state.raw<Mesh>()

	/** Scales a fill bar from its left end. */
	function fill(mesh: Mesh | undefined, ratio: number) {
		if (!mesh) return
		const r = Math.max(0.0001, Math.min(1, ratio))
		mesh.scale.x = r
		mesh.position.x = (-width * (1 - r)) / 2
	}

	useTask(() => {
		fill(hp, unit.hp / unit.stats.hp)
		fill(gauge, unit.gauge / GAUGE_FULL)
	})
</script>

<Billboard position.y={height}>
	<T.Mesh renderOrder={20}>
		<T.PlaneGeometry args={[width + 0.06, HP_HEIGHT + GAUGE_HEIGHT + 0.08]} />
		<T.MeshBasicMaterial
			color={0x0b101c}
			depthTest={false}
			opacity={0.8}
			toneMapped={false}
			transparent
		/>
	</T.Mesh>
	<T.Mesh position.y={GAUGE_HEIGHT / 2 + 0.01} renderOrder={21} bind:ref={hp}>
		<T.PlaneGeometry args={[width, HP_HEIGHT]} />
		<T.MeshBasicMaterial
			color={TEAM_COLOURS[unit.team]}
			depthTest={false}
			toneMapped={false}
			transparent
		/>
	</T.Mesh>
	<T.Mesh position.y={-HP_HEIGHT / 2 - 0.01} renderOrder={21} bind:ref={gauge}>
		<T.PlaneGeometry args={[width, GAUGE_HEIGHT]} />
		<T.MeshBasicMaterial color={0xffe39a} depthTest={false} toneMapped={false} transparent />
	</T.Mesh>
</Billboard>
