import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Transform } from "#lib/common/unity/Transform.svelte.ts"
import type { UnitModelName } from "#lib/components/prefabs/UnitModel.svelte"
import { Directions } from "#lib/enums/Directions.ts"
import { toEuler } from "#lib/extensions/DirectionsExtensions.ts"
import type { Job } from "./actor/Job.ts"
import { Rank } from "./actor/Rank.ts"
import { Stats } from "./actor/Stats.ts"
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
	readonly stats: Stats
	readonly rank: Rank
	job: Job | null = null
	movement: Movement | null = null

	#tile: Tile | null = null

	constructor({
		name,
		model,
		notifications
	}: {
		name: string
		model: UnitModelName
		notifications: NotificationCenter
	}) {
		this.name = name
		this.model = model
		// Every unit has these (see `UnitFactory`); call `rank.init` to set its level.
		this.stats = new Stats(notifications)
		this.rank = new Rank(this.stats, notifications)
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
