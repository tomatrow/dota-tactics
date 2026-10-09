<!-- Renders a `Unit`: its prefab model, posed by the unit's (and its jumper's) transform. -->
<script lang="ts">
	import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
	import UnitModel from "./prefabs/UnitModel.svelte"

	let { unit }: { unit: Unit } = $props()
</script>

<UnitModel
	name={unit.name}
	jumper={{
		position: unit.jumper.position,
		rotation: [0, unit.jumper.yaw, 0]
	}}
	model={unit.model}
	position={unit.transform.position}
	rotation={[0, unit.transform.yaw, 0]}
	scale={unit.transform.scale}
/>
