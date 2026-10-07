/**
 * Unity's `UnityEngine.Random`, as a seeded instance (one per battle: `BattleController.random`)
 * so a battle can be replayed with `?seed=`. mulberry32: a small, fast 32-bit generator.
 */
export class Random {
	/** A seed from the platform's randomness. */
	static randomSeed(): number {
		return crypto.getRandomValues(new Uint32Array(1))[0]!
	}

	readonly seed: number
	#state: number

	constructor(seed: number) {
		this.seed = seed >>> 0
		this.#state = this.seed
	}

	/** Unity's `Random.value`: a number in [0, 1) (Unity's includes 1). */
	get value(): number {
		let t = (this.#state = (this.#state + 0x6d2b79f5) | 0)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}

	/** Unity's `Random.Range(int min, int max)`: a whole number in [min, max). */
	rangeInt(min: number, max: number): number {
		return max <= min ? min : min + Math.floor(this.value * (max - min))
	}

	/** Unity's `Random.Range(float min, float max)`: a number in [min, max]. */
	rangeFloat(min: number, max: number): number {
		return min + this.value * (max - min)
	}
}
