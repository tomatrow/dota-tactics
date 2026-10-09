import { describe, expect, test, vi } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { Random } from "#lib/common/Random.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { Facings } from "#lib/enums/Facings.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Targets } from "#lib/enums/Targets.ts"
import { getFacing } from "#lib/extensions/FacingsExtensions.ts"
import { UnitFactory } from "#lib/factory/UnitFactory.ts"
import { Point } from "#lib/model/Point.ts"
import { Turn } from "#lib/model/Turn.ts"
import { board } from "#lib/testing/board.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { instantiateAttackPattern } from "./AttackPatternPrefab.ts"
import { ComputerPlayer } from "./ComputerPlayer.ts"

const { North, East, South, West } = Directions

interface Placed {
	recipe: string
	at: [x: number, y: number]
	dir?: Directions
}

/** A board of `rows` (see `board`) with these units on it; the first one's turn. */
function setup(rows: string[], ...placed: Placed[]) {
	const notifications = new NotificationCenter()
	const random = new Random(1)
	const b = board(...rows)
	const units = placed.map(({ recipe, at: [x, y], dir = North }) => {
		const unit = UnitFactory.create(recipe, 10, { notifications, random })!
		unit.place(b.getTile(Point.of(x, y)))
		unit.dir = dir
		return unit
	})
	const turn = new Turn()
	turn.change(units[0]!)
	return { cpu: new ComputerPlayer({ board: b, random, turn }), units, random, board: b }
}

/** Gives `unit` an attack pattern of just `ability`, for `target`. */
function only(unit: Unit, ability: string, target: Targets, random: Random) {
	unit.attackPattern = instantiateAttackPattern(
		{
			name: "Test",
			pickers: ["Only"],
			children: [{ name: "Only", picker: { type: "FixedAbilityPicker", target, ability } }]
		},
		unit,
		{ random }
	)
}

function evaluate(cpu: ComputerPlayer) {
	const plan = cpu.evaluate()
	return {
		ability: plan.ability?.name ?? null,
		target: plan.target,
		move: `${plan.moveLocation}`,
		fire: `${plan.fireLocation}`,
		dir: plan.attackDirection
	}
}

const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

const flat = (width: number, height = 1) => Array.from({ length: height }, () => "0".repeat(width))

describe("ComputerPlayer.evaluate", () => {
	test("attacks a foe from behind, where it can", () => {
		const { cpu } = setup(
			flat(3, 3),
			{ recipe: "Enemy Warrior", at: [0, 0] },
			{ recipe: "Kamau", at: [1, 1], dir: North }
		)
		expect(evaluate(cpu)).toEqual({
			ability: "Attack",
			target: Targets.Foe,
			move: "(1,0)",
			fire: "(1,0)",
			dir: North
		})
	})

	test("puts everyone back where they were", () => {
		const { cpu, units } = setup(
			flat(3, 3),
			{ recipe: "Enemy Warrior", at: [0, 0], dir: West },
			{ recipe: "Kamau", at: [1, 1] }
		)
		const where = () => units.map((u) => [`${u.tile?.pos}`, u.tile?.content === u, u.dir])
		const before = where()
		cpu.evaluate()
		expect(where()).toEqual(before)
	})

	test("won't hit an ally to get at a foe", () => {
		const { cpu } = setup(
			flat(5),
			{ recipe: "Enemy Rogue", at: [0, 0] },
			{ recipe: "Enemy Wizard", at: [2, 0] },
			{ recipe: "Kamau", at: [4, 0], dir: West }
		)
		expect(evaluate(cpu)).toMatchObject({ ability: "Attack", move: "(3,0)", dir: East })
	})

	test("no foe in reach: no ability, but as far as it can go toward the nearest foe", () => {
		const { cpu } = setup(
			flat(10),
			{ recipe: "Enemy Warrior", at: [0, 0] },
			{ recipe: "Kamau", at: [9, 0] }
		)
		expect(evaluate(cpu)).toMatchObject({ ability: null, move: "(4,0)" })
	})

	test("the nearest foe is one that isn't knocked out", () => {
		const { cpu, units } = setup(
			flat(12),
			{ recipe: "Enemy Warrior", at: [4, 0] },
			{ recipe: "Alaois", at: [2, 0] },
			{ recipe: "Kamau", at: [11, 0] }
		)
		units[1]!.stats.set(StatTypes.HP, 0)
		expect(evaluate(cpu)).toMatchObject({ ability: null, move: "(8,0)" })
	})

	test("aims a spell where it hits the most foes and no allies, from behind them", () => {
		const { cpu, units, random } = setup(
			flat(8, 8),
			{ recipe: "Enemy Wizard", at: [0, 0] },
			{ recipe: "Alaois", at: [3, 3] },
			{ recipe: "Kamau", at: [3, 4] },
			{ recipe: "Enemy Warrior", at: [3, 5] }
		)
		const [wizard, alaois, kamau] = units as [Unit, Unit, Unit]
		only(wizard, "Water", Targets.Foe, random)
		const plan = cpu.evaluate()
		expect([plan.ability?.name, `${plan.fireLocation}`]).toEqual(["Water", "(3,3)"])
		// Within its move (3), from where Water reaches (3), and not where it would be splashed.
		const move = plan.moveLocation
		expect(distance(move, Point.of(0, 0))).toBeLessThanOrEqual(3)
		expect(distance(move, plan.fireLocation)).toBeLessThanOrEqual(3)
		expect(distance(move, plan.fireLocation)).toBeGreaterThan(1)
		// (`getFacing` only needs the attacker's position.)
		const attacker = { tile: { pos: move } } as Unit
		expect([getFacing(attacker, alaois), getFacing(attacker, kamau)]).toEqual([
			Facings.Back,
			Facings.Back
		])
	})

	test("heals an ally, with it in the spell's area", () => {
		const { cpu, units, random } = setup(
			flat(6, 6),
			{ recipe: "Enemy Wizard", at: [0, 0] },
			{ recipe: "Enemy Warrior", at: [2, 2] }
		)
		const [wizard, warrior] = units as [Unit, Unit]
		only(wizard, "Cure", Targets.Ally, random)
		const plan = cpu.evaluate()
		expect([plan.ability?.name, plan.target]).toEqual(["Cure", Targets.Ally])
		expect(distance(plan.fireLocation, warrior.tile!.pos)).toBeLessThanOrEqual(1)
	})

	test("an ability on itself: anywhere it can move to, aimed there", () => {
		const { cpu, units, random } = setup(flat(5), { recipe: "Enemy Warrior", at: [0, 0] })
		only(units[0]!, "First Aid", Targets.Self, random)
		vi.spyOn(random, "int").mockReturnValueOnce(2)
		expect(evaluate(cpu)).toMatchObject({ ability: "First Aid", move: "(3,0)", fire: "(3,0)" })
	})

	test("an ability on itself, with nowhere to move: stays put", () => {
		const { cpu, units, random } = setup(["0"], { recipe: "Enemy Warrior", at: [0, 0] })
		only(units[0]!, "First Aid", Targets.Self, random)
		expect(evaluate(cpu)).toMatchObject({ ability: "First Aid", move: "(0,0)", fire: "(0,0)" })
	})

	test("an angle score below zero still picks the option", () => {
		// Earth Render's line from (1, 0) hits three heroes from the front (3 × 50) and two
		// enemies from behind (2 × -90): a score of 1, and an angle score of -30.
		const { cpu, units, random } = setup(
			flat(7),
			{ recipe: "Enemy Warrior", at: [0, 0] },
			{ recipe: "Kamau", at: [2, 0], dir: West },
			{ recipe: "Alaois", at: [3, 0], dir: West },
			{ recipe: "Hania", at: [4, 0], dir: West },
			{ recipe: "Enemy Rogue", at: [5, 0], dir: East },
			{ recipe: "Enemy Wizard", at: [6, 0], dir: East }
		)
		only(units[0]!, "Earth Render", Targets.Foe, random)
		expect(evaluate(cpu)).toMatchObject({ ability: "Earth Render", move: "(1,0)", dir: East })
	})
})

describe("ComputerPlayer.determineEndFacingDirection", () => {
	test.each([
		[[2, 4], North],
		[[4, 2], East],
		[[2, 0], South],
		[[0, 2], West]
	] as const)("faces the nearest foe (at %j): %i", (at, dir) => {
		const { cpu } = setup(
			flat(5, 5),
			{ recipe: "Enemy Warrior", at: [2, 2], dir: ((dir + 2) % 4) as Directions },
			{ recipe: "Kamau", at: [...at] }
		)
		expect(cpu.determineEndFacingDirection()).toBe(dir)
	})

	test("leaves the actor facing as it was", () => {
		const { cpu, units } = setup(
			flat(5, 5),
			{ recipe: "Enemy Warrior", at: [2, 2], dir: South },
			{ recipe: "Kamau", at: [2, 4] }
		)
		cpu.determineEndFacingDirection()
		expect(units[0]!.dir).toBe(South)
	})

	test("no foe: a random way", () => {
		const { cpu, random } = setup(flat(5, 5), { recipe: "Enemy Warrior", at: [2, 2] })
		vi.spyOn(random, "int").mockReturnValueOnce(3)
		expect(cpu.determineEndFacingDirection()).toBe(West)
	})
})
