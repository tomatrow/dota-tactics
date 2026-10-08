import { describe, expect, test } from "vitest"
import { convert, stale } from "./convert-unity.ts"
import { parseUnityYaml } from "./unity-yaml.ts"

describe("parseUnityYaml", () => {
	test("splits a file into its documents", () => {
		const objects = parseUnityYaml(
			[
				"%YAML 1.1",
				"%TAG !u! tag:unity3d.com,2011:",
				"--- !u!114 &11400000",
				"MonoBehaviour:",
				"  m_Name: Level_0",
				"  tiles:",
				"  - {x: 1, y: 3, z: 5}",
				"--- !u!4 &275820492 stripped",
				"Transform:",
				"  m_PrefabParentObject: {fileID: 409630, guid: 487ac6b1, type: 2}"
			].join("\n")
		)

		expect(objects).toEqual([
			{
				classId: 114,
				fileId: "11400000",
				type: "MonoBehaviour",
				stripped: false,
				fields: { m_Name: "Level_0", tiles: [{ x: 1, y: 3, z: 5 }] }
			},
			{
				classId: 4,
				fileId: "275820492",
				type: "Transform",
				stripped: true,
				fields: { m_PrefabParentObject: { fileID: 409630, guid: "487ac6b1", type: 2 } }
			}
		])
	})
})

// Reads the whole Unity project and formats every file: slow on a busy machine.
test("generated resources are up to date (run `pnpm convert`)", { timeout: 30_000 }, async () => {
	expect(await stale(await convert())).toEqual([])
})
