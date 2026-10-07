import { useTexture } from "@threlte/extras"
import type { Texture } from "three"

/**
 * `useTexture` as a plain promise, for `await` in component scripts. Must be called during
 * component initialisation. Loads are cached per URL, so every caller shares one `Texture`.
 */
export function loadTexture(url: string): Promise<Texture> {
	return Promise.resolve(useTexture(url))
}
