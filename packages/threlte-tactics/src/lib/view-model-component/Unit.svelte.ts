import { Transform } from "#lib/common/unity/Transform.svelte.ts"
import type { UnitModelName } from "#lib/components/prefabs/UnitModel.svelte"
import { Directions } from "#lib/enums/Directions.ts"
import { toEuler } from "#lib/extensions/DirectionsExtensions.ts"
import type { Movement } from "./movement/Movement.ts"
import type { Tile } from "./Tile.svelte.ts"

/**
 * Port of `View Model Component/Unit.cs`: a unit on the board. Holds the unit's other components
 * as typed fields (Unity's `GetComponent`).
 */
export class Unit {
	/** The GameObject's name. */
	readonly name: string
	/** The prefab the unit was made from. */
	readonly model: UnitModelName
	readonly transform = new Transform()
	/** The prefab's `Jumper` child, which hops and spins while the unit moves. */
	readonly jumper = new Transform()

	dir: Directions = Directions.North
	movement: Movement | null = null

	#tile: Tile | null = null

	constructor({ name, model }: { name: string; model: UnitModelName }) {
		this.name = name
		this.model = model
	}

	get tile(): Tile | null {
		return this.#tile
	}

	place(target: Tile | null): void {
		// Make sure old tile location is not still pointing to this unit
		if (this.#tile !== null && this.#tile.content === this) this.#tile.content = null

		// Link unit and tile references
		this.#tile = target

		if (target !== null) target.content = this
	}

	/** Snaps the transform to the unit's tile and direction. */
	match(): void {
		this.transform.localPosition = this.#tile!.center
		this.transform.localEulerAngles = toEuler(this.dir)
	}
}
