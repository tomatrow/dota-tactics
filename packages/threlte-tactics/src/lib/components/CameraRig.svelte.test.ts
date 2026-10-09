import { render } from "@threlte/test"
import { Vector3 } from "three"
import { expect, test } from "vitest"
import CameraRig from "./CameraRig.svelte"

test("eases towards what it follows, then settles", () => {
	const { scene, advance } = render(CameraRig, { follow: [10, 0, 0] })
	const rig = scene.getObjectByName("Camera Rig")!

	// Each frame it covers speed × delta of the way: 3 × 0.1 s.
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

test("looks north-east (+X, −Z) and down at the isometric angle, from 10 units away", () => {
	const { scene } = render(CameraRig)
	const camera = scene.getObjectByName("Main Camera")!
	camera.updateWorldMatrix(true, false)

	const look = camera.getWorldDirection(new Vector3())
	const diagonal = 1 / Math.sqrt(3)
	expect(look.x).toBeCloseTo(diagonal)
	expect(look.y).toBeCloseTo(-diagonal)
	expect(look.z).toBeCloseTo(-diagonal)
	expect(camera.getWorldPosition(new Vector3()).length()).toBeCloseTo(10)
})
