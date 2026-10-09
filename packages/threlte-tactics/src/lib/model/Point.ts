const interned = new Map<string, Point>()

/**
 * Port of `Model/Point.cs`: a board coordinate (see `Tile` for where it is in the world). Points
 * are interned: `Point.of` always returns the same instance for the same coordinates, so `===`
 * compares them and they can key a `Map`.
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
