// A minimal reader for Unity's text serialization format (`.asset`, `.prefab`, `.unity`, `.meta`).
//
// A Unity YAML file is a stream of documents, each introduced by a header such as
// `--- !u!114 &11400000` (class ID 114 = MonoBehaviour, file ID 11400000). The body of each
// document is a single-key mapping from the type name to its fields.
import { readFile } from "node:fs/promises"
import { parse } from "yaml"

export interface UnityObject {
	/** Unity class ID (1 = GameObject, 4 = Transform, 114 = MonoBehaviour, …). */
	classId: number
	/** The object's local file ID, which other objects reference via `{fileID: …}`. */
	fileId: string
	/** The type name, e.g. `MonoBehaviour`. */
	type: string
	/** True for `stripped` prefab-instance stand-ins, which carry no data of their own. */
	stripped: boolean
	fields: Record<string, unknown>
}

/** A reference to another object: `{fileID: 11400000, guid: …, type: 2}`. */
export interface UnityRef {
	fileID: number
	guid?: string
	type?: number
}

const header = /^--- !u!(\d+) &(-?\d+)( stripped)?$/

export function parseUnityYaml(text: string): UnityObject[] {
	const objects: UnityObject[] = []
	let current: { classId: number; fileId: string; stripped: boolean; lines: string[] } | undefined

	const flush = () => {
		if (!current) return
		const body = (parse(current.lines.join("\n")) ?? {}) as Record<string, unknown>
		const [type = "", fields] = Object.entries(body)[0] ?? []
		objects.push({
			classId: current.classId,
			fileId: current.fileId,
			type,
			stripped: current.stripped,
			fields: (fields ?? {}) as Record<string, unknown>
		})
	}

	for (const line of text.split(/\r?\n/)) {
		const match = header.exec(line)
		if (match) {
			flush()
			current = {
				classId: Number(match[1]),
				fileId: match[2] ?? "",
				stripped: match[3] !== undefined,
				lines: []
			}
		} else if (current) {
			current.lines.push(line)
		}
	}
	flush()

	return objects
}

export async function readUnityYaml(path: string): Promise<UnityObject[]> {
	return parseUnityYaml(await readFile(path, "utf8"))
}

/** The single MonoBehaviour of a ScriptableObject `.asset` file. */
export async function readScriptableObject(path: string): Promise<Record<string, unknown>> {
	const objects = await readUnityYaml(path)
	const behaviour = objects.find((o) => o.type === "MonoBehaviour")
	if (!behaviour) throw new Error(`No MonoBehaviour in ${path}`)
	return behaviour.fields
}

/** The GUID Unity assigned to an asset, from its `.meta` file. */
export async function readGuid(assetPath: string): Promise<string> {
	const meta = parse(await readFile(`${assetPath}.meta`, "utf8")) as { guid?: string }
	if (!meta.guid) throw new Error(`No guid in ${assetPath}.meta`)
	return meta.guid
}
