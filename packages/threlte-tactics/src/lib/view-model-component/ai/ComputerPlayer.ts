import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Directions } from "#lib/enums/Directions.ts"
import { Targets } from "#lib/enums/Targets.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { PlanOfAttack } from "./PlanOfAttack.ts"

/** What the computer player needs of its battle (Unity: the `BattleController` it's on). */
export type ComputerPlayerOwner = Pick<BattleController, "board" | "random" | "turn">

/**
 * Port of `View Model Component/AI/ComputerPlayer.cs`: plans the turns of computer-driven units.
 * A component of Unity's Battle Controller, which the battle states ask.
 */
export class ComputerPlayer {
	readonly #bc: ComputerPlayerOwner

	/** Unity's `Awake`. */
	constructor(bc: ComputerPlayerOwner) {
		this.#bc = bc
	}

	get #actor(): Unit {
		return this.#bc.turn.actor!
	}

	evaluate(): PlanOfAttack {
		// Create and fill out a plan of attack
		const poa = new PlanOfAttack()

		// Step 1: Decide what ability to use
		const pattern = this.#actor.attackPattern
		if (pattern) pattern.pick(poa)
		else this.#defaultAttackPattern(poa)

		// Step 2: Determine where to move and aim to best use the ability
		this.#placeholderCode(poa)

		// Return the completed plan
		return poa
	}

	#defaultAttackPattern(poa: PlanOfAttack): void {
		// Just get the first "Attack" ability
		poa.ability = this.#actor.attack
		poa.target = Targets.Foe
	}

	// TODO(part 25): move and aim with a purpose.
	#placeholderCode(poa: PlanOfAttack): void {
		const { board, random } = this.#bc
		const actor = this.#actor

		// Move to a random location within the unit's move range
		let tiles = actor.movement!.getTilesInRange(board)
		let randomTile = tiles.length > 0 ? tiles[random.rangeInt(0, tiles.length)]! : null
		poa.moveLocation = randomTile !== null ? randomTile.pos : actor.tile!.pos

		// Pick a random attack direction (for direction based abilities)
		poa.attackDirection = random.rangeInt(0, 4) as Directions

		// Pick a random fire location based on having moved to the random tile
		const start = actor.tile
		actor.place(randomTile)
		tiles = poa.ability!.range.getTilesInRange(board)
		if (tiles.length === 0) {
			poa.ability = null
			poa.fireLocation = poa.moveLocation
		} else {
			randomTile = tiles[random.rangeInt(0, tiles.length)]!
			poa.fireLocation = randomTile.pos
		}
		actor.place(start)
	}

	// TODO(part 25): face the nearest foe.
	determineEndFacingDirection(): Directions {
		return this.#bc.random.rangeInt(0, 4) as Directions
	}
}
