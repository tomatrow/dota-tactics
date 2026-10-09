import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { Directions } from "#lib/enums/Directions.ts"
import { Facings } from "#lib/enums/Facings.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Targets } from "#lib/enums/Targets.ts"
import { getFacing } from "#lib/extensions/FacingsExtensions.ts"
import type { Alliance } from "#lib/view-model-component/actor/Alliance.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { AttackOption } from "./AttackOption.ts"
import { PlanOfAttack } from "./PlanOfAttack.ts"

/** What the computer player needs of its battle. */
export type ComputerPlayerOwner = Pick<BattleController, "board" | "random" | "turn">

/**
 * Port of `View Model Component/AI/ComputerPlayer.cs`: plans the turns of computer-driven units.
 * The unit's attack pattern picks the ability; this tries every place it can move to and every way
 * it can aim from there, and picks the one that affects the most of whom the ability is meant for
 * (and the fewest others), from the best angle. With no good option it heads for the nearest foe.
 * The battle states ask it.
 */
export class ComputerPlayer {
	readonly #bc: ComputerPlayerOwner
	#nearestFoe: Unit | null = null

	/** Unity's `Awake`. */
	constructor(bc: ComputerPlayerOwner) {
		this.#bc = bc
	}

	get #actor(): Unit {
		return this.#bc.turn.actor!
	}

	get #alliance(): Alliance {
		return this.#actor.alliance!
	}

	evaluate(): PlanOfAttack {
		const poa = new PlanOfAttack()
		const pattern = this.#actor.attackPattern
		if (pattern) pattern.pick(poa)
		else this.#defaultAttackPattern(poa)

		if (this.#isPositionIndependent(poa)) this.#planPositionIndependent(poa)
		else if (this.#isDirectionIndependent(poa)) this.#planDirectionIndependent(poa)
		else this.#planDirectionDependent(poa)

		if (poa.ability === null) this.#moveTowardOpponent(poa)

		return poa
	}

	/** Faces the nearest foe (so that it sees this unit's front), or a random way if there is none. */
	determineEndFacingDirection(): Directions {
		const actor = this.#actor
		let dir = this.#bc.random.int(0, 4) as Directions
		this.#findNearestFoe()
		if (this.#nearestFoe !== null) {
			const start = actor.dir
			for (let i = 0; i < 4; ++i) {
				actor.dir = i as Directions
				if (getFacing(this.#nearestFoe, actor) === Facings.Front) {
					dir = actor.dir
					break
				}
			}
			actor.dir = start
		}
		return dir
	}

	#defaultAttackPattern(poa: PlanOfAttack): void {
		// Just get the first "Attack" ability
		poa.ability = this.#actor.attack
		poa.target = Targets.Foe
	}

	#isPositionIndependent(poa: PlanOfAttack): boolean {
		const range = poa.ability!.range
		return !range.positionOriented
	}

	#isDirectionIndependent(poa: PlanOfAttack): boolean {
		const range = poa.ability!.range
		return !range.directionOriented
	}

	/** Where it stands doesn't matter (an ability on itself, or on everyone): anywhere it can go. */
	#planPositionIndependent(poa: PlanOfAttack): void {
		const moveOptions = this.#getMoveOptions()
		// With nowhere to move, stay put.
		const tile =
			moveOptions.length > 0 ?
				moveOptions[this.#bc.random.int(0, moveOptions.length)]!
			:	this.#actor.tile!
		poa.moveLocation = poa.fireLocation = tile.pos
	}

	/** Every tile it can aim at, from every tile it can move to. */
	#planDirectionIndependent(poa: PlanOfAttack): void {
		const { board, random } = this.#bc
		const actor = this.#actor
		const startTile = actor.tile
		const map = new Map<Tile, AttackOption>()
		const ar = poa.ability!.range
		const moveOptions = this.#getMoveOptions()

		for (const moveTile of moveOptions) {
			actor.place(moveTile)
			const fireOptions = ar.getTilesInRange(board)

			for (const fireTile of fireOptions) {
				let ao = map.get(fireTile)
				if (ao === undefined) {
					ao = new AttackOption(random)
					map.set(fireTile, ao)
					ao.target = fireTile
					ao.direction = actor.dir
					this.#rateFireLocation(poa, ao)
				}

				ao.addMoveTarget(moveTile)
			}
		}

		actor.place(startTile)
		const list = [...map.values()]
		this.#pickBestOption(poa, list)
	}

	/** Every way it can face, from every tile it can move to. */
	#planDirectionDependent(poa: PlanOfAttack): void {
		const actor = this.#actor
		const startTile = actor.tile
		const startDirection = actor.dir
		const list: AttackOption[] = []
		const moveOptions = this.#getMoveOptions()

		for (const moveTile of moveOptions) {
			actor.place(moveTile)

			for (let j = 0; j < 4; ++j) {
				actor.dir = j as Directions
				const ao = new AttackOption(this.#bc.random)
				ao.target = moveTile
				ao.direction = actor.dir
				this.#rateFireLocation(poa, ao)
				ao.addMoveTarget(moveTile)
				list.push(ao)
			}
		}

		actor.place(startTile)
		actor.dir = startDirection
		this.#pickBestOption(poa, list)
	}

	/** Whether the unit on `tile` (or the tile) is whom the plan's ability is meant for. */
	#isAbilityTargetMatch(poa: PlanOfAttack, tile: Tile): boolean {
		let isMatch = false
		if (poa.target === Targets.Tile) {
			isMatch = true
		} else if (poa.target !== Targets.None) {
			const other = tile.content!.alliance
			if (other !== null && this.#alliance.isMatch(other, poa.target)) isMatch = true
		}

		return isMatch
	}

	#getMoveOptions(): Tile[] {
		return this.#actor.movement!.getTilesInRange(this.#bc.board)
	}

	/** Notes whom the ability would affect if used as `option` says. */
	#rateFireLocation(poa: PlanOfAttack, option: AttackOption): void {
		const actor = this.#actor
		const area = poa.ability!.area
		const tiles = area.getTilesInArea(this.#bc.board, option.target.pos)
		option.areaTargets = tiles
		option.isCasterMatch = this.#isAbilityTargetMatch(poa, actor.tile!)

		for (const tile of tiles) {
			// (Where the caster stands now isn't where it will be.)
			if (actor.tile === tile || !poa.ability!.isTarget(tile)) continue

			const isMatch = this.#isAbilityTargetMatch(poa, tile)
			option.addMark(tile, isMatch)
		}
	}

	/**
	 * The options with the best score (at least 1), then of those the ones with the best angle; one
	 * of them at random. None: the plan's ability is cleared, a sign not to perform it.
	 */
	#pickBestOption(poa: PlanOfAttack, list: AttackOption[]): void {
		let bestScore = 1
		const bestOptions: AttackOption[] = []
		for (const option of list) {
			const score = option.getScore(this.#actor, poa.ability!)
			if (score > bestScore) {
				bestScore = score
				bestOptions.length = 0
				bestOptions.push(option)
			} else if (score === bestScore) {
				bestOptions.push(option)
			}
		}

		if (bestOptions.length === 0) {
			poa.ability = null // Clear ability as a sign not to perform it
			return
		}

		const finalPicks: AttackOption[] = []
		// The best option wins even when every angle-based score is negative.
		bestScore = -Infinity
		for (const option of bestOptions) {
			const score = option.bestAngleBasedScore
			if (score > bestScore) {
				bestScore = score
				finalPicks.length = 0
				finalPicks.push(option)
			} else if (score === bestScore) {
				finalPicks.push(option)
			}
		}

		const choice = finalPicks[this.#bc.random.int(0, finalPicks.length)]!
		poa.fireLocation = choice.target.pos
		poa.attackDirection = choice.direction
		poa.moveLocation = choice.bestMoveTile!.pos
	}

	/** The foe with HP left that is the fewest steps away (over any tiles). */
	#findNearestFoe(): void {
		this.#nearestFoe = null
		this.#bc.board.search(this.#actor.tile!, (_arg1, arg2) => {
			if (this.#nearestFoe === null && arg2.content !== null) {
				const other = arg2.content.alliance
				if (other !== null && this.#alliance.isMatch(other, Targets.Foe)) {
					const unit = arg2.content
					const stats = unit.stats
					if (stats.get(StatTypes.HP) > 0) {
						this.#nearestFoe = unit
						return true
					}
				}
			}
			return this.#nearestFoe === null
		})
	}

	/** As far along the way to the nearest foe as it can move (or stay put). */
	#moveTowardOpponent(poa: PlanOfAttack): void {
		const moveOptions = this.#getMoveOptions()
		this.#findNearestFoe()
		if (this.#nearestFoe !== null) {
			let toCheck = this.#nearestFoe.tile
			while (toCheck !== null) {
				if (moveOptions.includes(toCheck)) {
					poa.moveLocation = toCheck.pos
					return
				}
				toCheck = toCheck.prev
			}
		}

		poa.moveLocation = this.#actor.tile!.pos
	}
}
