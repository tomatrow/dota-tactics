<!--
	Unity is left-handed (+Z forward); three is right-handed (+Z towards the viewer). Everything
	ported from Unity lives inside this group, which mirrors Z. That way positions, rotations and
	primitive meshes keep Unity's numbers verbatim and still render the way they did in Unity
	(three flips the face winding of mirrored meshes automatically).

	The one exception is cameras: three cameras look down their local -Z while Unity's look down
	+Z, so a camera inside this group needs its own `scale={[1, 1, -1]}` to undo the mirror.
-->
<script lang="ts">
	import { T } from "@threlte/core"
	import type { Snippet } from "svelte"

	let { children }: { children: Snippet } = $props()
</script>

<T.Group name="UnityWorld" scale={[1, 1, -1]}>
	{@render children()}
</T.Group>
