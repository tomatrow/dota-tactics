// The cartographer's committed output. Vite serves it in dev (see `server.fs.allow`) and copies it
// into the build as a hashed asset, so re-running the extraction only needs a reload.
import mapUrl from "../../../../dota-cartographer/out/dota_map.json?url"
import { MapModel } from "./model.ts"
import { parseMap } from "./schema.ts"

export async function loadMap(url: string = mapUrl): Promise<MapModel> {
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`couldn't load ${url}: ${String(response.status)} ${response.statusText}`)
	}
	return new MapModel(parseMap(await response.json()))
}
