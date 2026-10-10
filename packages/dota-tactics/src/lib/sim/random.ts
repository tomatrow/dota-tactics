/**
 * The simulation's random numbers: seeded, so a game can be replayed. One instance per world.
 * mulberry32: a small, fast 32-bit generator.
 */
export class Random {
	/** A seed from the platform's randomness. */
	static randomSeed(): number {
		return crypto.getRandomValues(new Uint32Array(1))[0]
	}

	readonly seed: number
	#state: number

	constructor(seed: number) {
		this.seed = seed >>> 0
		this.#state = this.seed
	}

	/** A number in [0, 1). */
	value(): number {
		let t = (this.#state = (this.#state + 0x6d2b79f5) | 0)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}

	/** True with probability `percent` / 100. */
	percent(percent: number): boolean {
		return this.value() * 100 < percent
	}
}
