const interned = new Map<string, Point>()

/**
 * Port of `Model/Point.cs`: a board coordinate. `x` maps to world X and `y` to world Z.
 *
 * Unity's `Point` is a value-type struct. Here every point is interned (`Point.of` always returns
 * the same instance for the same coordinates), so `===` behaves like the struct's `==` and points
 * can key a `Map` directly.
 */
export class Point {
	readonly x: number
	readonly y: number

	private constructor(x: number, y: number) {
		this.x = x
		this.y = y
	}

	static of(x: number, y: number): Point {
		const key = `${x},${y}`
		let point = interned.get(key)
		if (!point) {
			point = new Point(x, y)
			interned.set(key, point)
		}
		return point
	}

	static readonly zero = Point.of(0, 0)

	add(other: Point): Point {
		return Point.of(this.x + other.x, this.y + other.y)
	}

	sub(other: Point): Point {
		return Point.of(this.x - other.x, this.y - other.y)
	}

	equals(other: Point): boolean {
		return this === other
	}

	toString(): string {
		return `(${this.x},${this.y})`
	}
}
