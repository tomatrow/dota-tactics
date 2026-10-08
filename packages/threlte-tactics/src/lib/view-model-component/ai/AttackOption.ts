import { intMinValue } from "#lib/common/unity/mathf.ts"
import type { Random } from "#lib/common/unity/Random.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { Facings } from "#lib/enums/Facings.ts"
import { getFacing } from "#lib/extensions/FacingsExtensions.ts"
import type { Ability } from "#lib/view-model-component/ability/Ability.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"

/** A unit the ability would affect, and whether it's one the ability is meant for. */
class Mark {
	readonly tile: Tile
	readonly isMatch: boolean

	constructor(tile: Tile, isMatch: boolean) {
		this.tile = tile
		this.isMatch = isMatch
	}
}

/**
 * Port of `View Model Component/AI/AttackOption.cs`: the computer's notes on one way to use an
 * ability (aimed at `target`, facing `direction`): whom it would affect, where the caster could
 * move to use it that way, and how good that is.
 */
export class AttackOption {
	/** The tile aimed at, or for a direction oriented ability the tile to use it from. */
	target!: Tile
	direction: Directions = Directions.North
	/** The ability's area of effect. */
	areaTargets: Tile[] = []
	/** Whether the caster is one the ability is meant for (so may stand in its area). */
	isCasterMatch = false
	#bestMoveTile: Tile | null = null
	#bestAngleBasedScore = 0
	readonly #marks: Mark[] = []
	readonly #moveTargets: Tile[] = []
	readonly #random: Random

	/** @param random Unity's `UnityEngine.Random`. */
	constructor(random: Random) {
		this.#random = random
	}

	get bestMoveTile(): Tile | null {
		return this.#bestMoveTile
	}

	get bestAngleBasedScore(): number {
		return this.#bestAngleBasedScore
	}

	addMoveTarget(tile: Tile): void {
		// Dont allow moving to a tile that would negatively affect the caster
		if (!this.isCasterMatch && this.areaTargets.includes(tile)) return
		this.#moveTargets.push(tile)
	}

	addMark(tile: Tile, isMatch: boolean): void {
		this.#marks.push(new Mark(tile, isMatch))
	}

	/** Scores the option based on how many of the targets are of the desired type. */
	getScore(caster: Unit, ability: Ability): number {
		this.#getBestMoveTarget(caster, ability)
		if (this.#bestMoveTile === null) return 0

		let score = 0
		for (const mark of this.#marks) {
			if (mark.isMatch) score++
			else score--
		}

		if (this.isCasterMatch && this.areaTargets.includes(this.#bestMoveTile)) score++

		return score
	}

	/** Picks the tile which is the most effective point for the caster to attack from. */
	#getBestMoveTarget(caster: Unit, ability: Ability): void {
		if (this.#moveTargets.length === 0) return

		if (this.#isAbilityAngleBased(ability)) {
			this.#bestAngleBasedScore = intMinValue
			const startTile = caster.tile
			const startDirection = caster.dir
			caster.dir = this.direction

			const bestOptions: Tile[] = []
			for (const moveTarget of this.#moveTargets) {
				caster.place(moveTarget)
				const score = this.#getAngleBasedScore(caster)
				if (score > this.#bestAngleBasedScore) {
					this.#bestAngleBasedScore = score
					bestOptions.length = 0
				}

				if (score === this.#bestAngleBasedScore) bestOptions.push(moveTarget)
			}

			caster.place(startTile)
			caster.dir = startDirection

			this.#filterBestMoves(bestOptions)
			this.#bestMoveTile = bestOptions[this.#random.rangeInt(0, bestOptions.length)]!
		} else {
			this.#bestMoveTile = this.#moveTargets[this.#random.rangeInt(0, this.#moveTargets.length)]!
		}
	}

	/** Whether the angle of attack is an important factor in the application of this ability. */
	#isAbilityAngleBased(ability: Ability): boolean {
		return ability.effects.some((child) => child.hitRate.isAngleBased)
	}

	/** Scores the option based on how many of the targets are a match, and the angle of attack. */
	#getAngleBasedScore(caster: Unit): number {
		let score = 0
		for (const mark of this.#marks) {
			const value = mark.isMatch ? 1 : -1
			const multiplier = this.#multiplierForAngle(caster, mark.tile)
			score += value * multiplier
		}
		return score
	}

	/** Keeps only the tiles in the area, if the caster is meant to be in it and can be. */
	#filterBestMoves(list: Tile[]): void {
		if (!this.isCasterMatch) return

		const canTargetSelf = list.some((tile) => this.areaTargets.includes(tile))

		if (canTargetSelf) {
			for (let i = list.length - 1; i >= 0; --i) {
				if (!this.areaTargets.includes(list[i]!)) list.splice(i, 1)
			}
		}
	}

	/** The chance to hit (roughly, as a percentage) from the caster's angle to the unit on `tile`. */
	#multiplierForAngle(caster: Unit, tile: Tile): number {
		const defender = tile.content
		if (defender === null) return 0

		const facing = getFacing(caster, defender)
		if (facing === Facings.Back) return 90
		if (facing === Facings.Side) return 75
		return 50
	}
}
