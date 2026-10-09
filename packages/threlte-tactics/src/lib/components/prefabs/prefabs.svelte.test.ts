import { render } from "@threlte/test"
import { BoxGeometry, type Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three"
import { describe, expect, test } from "vitest"
import { Directions } from "#lib/enums/Directions.ts"
import { Materials } from "#lib/materials/materials.ts"
import TileSelectionIndicator from "./TileSelectionIndicator.svelte"
import Tile from "./Tile.svelte"
import UnitModel from "./UnitModel.svelte"

const meshes = (root: { traverse(fn: (o: unknown) => void): void }) => {
	const found: Mesh[] = []
	root.traverse((o) => {
		if ((o as Mesh).isMesh) found.push(o as Mesh)
	})
	return found
}

describe("Tile", () => {
	test("is a unit cube with the textured Dirt material", async () => {
		const { scene } = render(Tile)

		const tile = scene.getObjectByName("Tile") as Mesh
		expect(tile.geometry).toBeInstanceOf(BoxGeometry)
		// The material waits for the texture to load.
		await expect
			.poll(() => (tile.material as MeshStandardMaterial).map, { timeout: 5000 })
			.toBeTruthy()
		expect((tile.material as MeshStandardMaterial).roughness).toBe(Materials.Dirt.roughness)
	})
})

describe("UnitModel", () => {
	test.each([
		["Hero", Materials.Ally.color],
		["Monster", Materials.Enemy.color]
	] as const)("%s has a body with two eyes", (model, bodyColor) => {
		const { scene } = render(UnitModel, { model })

		const spheres = meshes(scene)
		expect(spheres).toHaveLength(3)
		expect(spheres.every((m) => m.geometry instanceof SphereGeometry)).toBe(true)

		const jumper = scene.getObjectByName("Jumper")
		const body = jumper?.children[0] as Mesh
		expect((body.material as MeshStandardMaterial).color.getHexString()).toBe(bodyColor.slice(1))
		expect(body.children).toHaveLength(2)
		// The eyes are on the front, which faces north (−Z).
		expect(body.children.every((eye) => eye.position.z < 0)).toBe(true)
	})
})

describe("TileSelectionIndicator", () => {
	test("brackets the four corners of a tile", () => {
		const { scene } = render(TileSelectionIndicator)

		const cubes = meshes(scene).filter((m) => m.geometry instanceof BoxGeometry)
		expect(cubes).toHaveLength(8)
		// Each corner gets two bars, one along each edge.
		const corners = new Map<string, number>()
		for (const cube of cubes) {
			const p = cube.getWorldPosition(new Vector3())
			const key = `${Math.sign(p.x)},${Math.sign(p.z)}`
			corners.set(key, (corners.get(key) ?? 0) + 1)
		}
		expect([...corners.values()]).toEqual([2, 2, 2, 2])
	})

	test("has a facing indicator, hidden as in the prefab", () => {
		const { scene } = render(TileSelectionIndicator)
		const indicator = scene.getObjectByName("Facing Indicator")!
		expect(indicator.visible).toBe(false)
		expect(meshes(indicator)).toHaveLength(4)
	})

	test("the facing indicator highlights the sphere on the selected side", () => {
		const { scene } = render(TileSelectionIndicator, {
			props: { facingIndicator: { selected: Directions.East } }
		})
		const indicator = scene.getObjectByName("Facing Indicator")!
		expect(indicator.visible).toBe(true)
		const colors = meshes(indicator).map((m) => [
			m.position.x,
			m.position.z,
			(m.material as MeshStandardMaterial).color.getHexString()
		])
		const [normal, selected] = [Materials.Default.color, Materials.Selection.color].map((c) =>
			c.slice(1)
		)
		// North (−Z), east (+X), south, west.
		expect(colors).toEqual([
			[0, -0.3, normal],
			[0.3, 0, selected],
			[0, 0.3, normal],
			[-0.3, 0, normal]
		])
	})
})
