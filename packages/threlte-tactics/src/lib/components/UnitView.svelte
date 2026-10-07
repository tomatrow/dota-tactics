<!-- Renders a `Unit`: its prefab model, posed by the unit's (and its jumper's) transform. -->
<script lang="ts">
	import { unityEuler } from "#lib/common/unity/euler.ts"
	import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
	import UnitModel from "./prefabs/UnitModel.svelte"

	let { unit }: { unit: Unit } = $props()
</script>

<UnitModel
	name={unit.name}
	jumper={{
		position: unit.jumper.localPosition,
		rotation: unityEuler(...unit.jumper.localEulerAngles)
	}}
	model={unit.model}
	position={unit.transform.localPosition}
	rotation={unityEuler(...unit.transform.localEulerAngles)}
	scale={unit.transform.localScale}
/>
