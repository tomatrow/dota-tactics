import { render } from "@threlte/test"
import { expect, test } from "vitest"
import CameraRig from "./CameraRig.svelte"

test("eases towards what it follows at Unity's speed, then settles", () => {
	const { scene, advance } = render(CameraRig, { follow: [10, 0, 0] })
	const rig = scene.getObjectByName("Camera Rig")!

	// Vector3.Lerp(position, follow, speed * Time.deltaTime) with speed 3 and 100 ms frames.
	advance({ delta: 100 })
	expect(rig.position.x).toBeCloseTo(3)
	advance({ delta: 100 })
	expect(rig.position.x).toBeCloseTo(5.1)

	advance({ count: 100, delta: 100 })
	expect(rig.position.toArray()).toEqual([10, 0, 0])
	expect(advance().frameInvalidated).toBe(false)
})

test("stays put without anything to follow", () => {
	const { scene, advance } = render(CameraRig)
	advance({ count: 3 })
	expect(scene.getObjectByName("Camera Rig")!.position.toArray()).toEqual([0, 0, 0])
})
