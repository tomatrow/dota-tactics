import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { MapModel } from "dota-tactics-grid/map/model.ts"
import { parseMap } from "dota-tactics-grid/map/schema.ts"

/** The cartographer's committed output. */
export const MAP_PATH = fileURLToPath(
	new URL("../../../../dota-cartographer/out/dota_map.json", import.meta.url)
)

/** The real map, read from disk (Node only). */
export function loadMapFromDisk(path: string = MAP_PATH): MapModel {
	return new MapModel(parseMap(JSON.parse(readFileSync(path, "utf8"))))
}
