/** A deterministic hash of two integers and a seed to [0, 1), so every load looks the same. */
export function hash2(x: number, y: number, seed: number): number {
	let n =
		(Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed, 982451653)) | 0
	n = Math.imul(n ^ (n >>> 13), 1274126177)
	n ^= n >>> 16
	return (n >>> 0) / 4294967296
}
