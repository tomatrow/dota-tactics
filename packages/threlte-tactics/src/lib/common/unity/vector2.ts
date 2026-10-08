/** A Unity `Vector2` as a plain tuple (see `Vector3`). */
export type Vector2 = [x: number, y: number]

/** Unity's `Vector2.normalized`: the zero vector for (nearly) zero vectors. */
export function normalized([x, y]: Vector2): Vector2 {
	const magnitude = Math.sqrt(x * x + y * y)
	return magnitude > 1e-5 ? [x / magnitude, y / magnitude] : [0, 0]
}

/** Unity's `Vector2.Dot`. */
export function dot([ax, ay]: Vector2, [bx, by]: Vector2): number {
	return ax * bx + ay * by
}
