import type { Ability, AbilityEffect } from "#lib/content/abilities.ts"
import { isCreep } from "#lib/content/units.ts"
import { magicDamage, physicalDamage } from "./combat.ts"
import type { Command } from "./commands.ts"
import { GAUGE_FULL, ticks } from "./constants.ts"
import { footprintDistance, isWalkable } from "./grid.ts"
import { LaneLine } from "./lane-line.ts"
import type { LaneName, Order, Unit } from "./unit.ts"
import type { World } from "./world.ts"

/** What a scripted hero is about: for the HUD and tests. */
export type Intent =
	| "dead"
	/** Standing until its charged spell lands. */
	| "casting"
	/** Leaving the area of an enemy's charged spell. */
	| "dodge"
	/** Low on HP: going back to heal (a hero with a heal, behind its Sentinel; else home). */
	| "retreat"
	/** Using its heal. */
	| "mend"
	/** Out of a Sentinel's or creeps' aggro, or away from a melee hero chasing it. */
	| "evade"
	| "kill"
	| "trade"
	| "lastHit"
	| "deny"
	/** The enemy hero is away: clearing the wave. */
	| "push"
	/** Hitting the enemy Sentinel while its own creeps hold its aggro. */
	| "siege"
	/** A full gauge held too long: spending it on something, for the MP. */
	| "bank"
	/** Standing with its wave: behind its front, or by its Sentinel when it has none. */
	| "lane"

/** A decision: what the hero is about, and the command it takes; null carries on as it is. */
interface Plan {
	readonly intent: Intent
	readonly command: Command | null
}

/** What the hero sees at a decision. */
interface Survey {
	/** The enemy hero, when it's alive. */
	readonly foe: Unit | null
	readonly ownTower: Unit | null
	readonly enemyTower: Unit | null
	readonly ownCreeps: readonly Unit[]
	readonly enemyCreeps: readonly Unit[]
	/**
	 * How far down the lane the hero's wave has got (its second creep from the front, so one
	 * creep chasing doesn't drag it), and the enemy's nearest creep; null for none.
	 */
	readonly front: number | null
	readonly enemyFront: number | null
	/** Its gauge is full. */
	readonly ready: boolean
	/** Its share of its HP, 0–1. */
	readonly health: number
}

/** Ticks between decisions: a fifth of a second, about a person's reaction time. */
const THINK_TICKS = 4

/** Under this share of its HP a hero goes back to heal, until it has `HEALED`. */
const RETREAT_AT = 0.3
const HEALED = 0.9

/** A hero with a heal uses it under this share of its HP. */
const MEND_AT = 0.55

/** How much more of its HP (as a share) than its foe's a hero needs to start a trade. */
const AHEAD_BY = 0.15

/** Tiles a hero walks, beyond its reach, for a last hit. */
const LAST_HIT_WALK = 3

/** How far (tiles, along the lane) behind its wave's front a hero stands: melee close, casters back. */
const BEHIND_MELEE = 2
const BEHIND_CASTER = 6

/** Tiles (along the lane) a hero waiting for its wave keeps from the enemy's: out of their aggro. */
const AGGRO_GAP = 9

/** Tiles a caster keeps from a melee enemy hero. */
const CASTER_SPACE = 6

/**
 * How near (tiles) its spot a hero counts as there, and how far off the lane's line it may stand:
 * walking stops its gauge, so it doesn't follow every step its wave's front takes.
 */
const SLACK = 3
const LANE_WIDTH = 4

/** Tiles a hero keeps outside an enemy Sentinel's reach, unless its creeps hold the Sentinel. */
const TOWER_MARGIN = 2

/** A hero holding a full gauge this long with nothing to spend it on hits something, for the MP. */
const BANK_AFTER = 2

/** The enemy hero this far away (tiles) or dead: time to push. */
const PUSH_DISTANCE = 16

/** Seconds a hero sticks to an ability it ordered (walking into reach) before thinking again. */
const COMMIT = 1.5

/**
 * A melee hero with this share of its HP and a full gauge goes for a caster up to `DIVE_RANGE`
 * tiles away: it walks faster (§13), so it catches one that doesn't chill it.
 */
const DIVE_AT = 0.6
const DIVE_RANGE = 14

/** A caster backs away from a melee hero coming for it this close (tiles). */
const KITE_RANGE = 8

/** What a point of damage to the enemy hero is worth, in gold, when choosing where to aim a spell. */
const HERO_DAMAGE_GOLD = 0.25

/** A spell is worth casting for this much gold (a melee creep's last hit), less its MP. */
const SPELL_WORTH = 36

/** Damage a creep in a fight takes while a charged spell charges, roughly. */
const CHARGE_ATTRITION = 60

/**
 * A scripted hero (DESIGN.md §11, milestone 5): it follows its wave, last-hits and denies, trades
 * when ahead, casts when it has the MP, dodges charged spells, keeps out of Sentinels' reach,
 * retreats at low HP and pushes while the enemy hero is away. It plays as a player does, by
 * issuing commands to its hero, so a game with it replays from the seed and the command log.
 *
 * `update()` runs before each `world.step()`; it decides every `THINK_TICKS` ticks.
 */
export class HeroAI {
	readonly world: World
	readonly unit: Unit
	/** What it's about, as of its last decision. */
	intent: Intent = "lane"
	readonly #line: LaneLine
	#retreating = false
	/** The tick its gauge last became full; -1 while it isn't. */
	#fullSince = -1
	/** The last command it gave, as JSON, so it doesn't give it again while it's in hand. */
	#last = ""
	/** The tick it gave its last command. */
	#lastAt = 0

	constructor(world: World, unit: Unit, lane: LaneName = "mid") {
		if (!unit.hero) throw new Error(`${unit.name} isn't a hero`)
		const own = world.lanes.find((l) => l.team === unit.team && l.name === lane)
		if (!own) throw new Error(`no ${unit.team} ${lane} lane`)
		this.world = world
		this.unit = unit
		this.#line = new LaneLine(own.path)
	}

	/** Called before each step: every few ticks, decides what to do and commands the hero. */
	update() {
		const { world, unit: me } = this
		if (!me.alive) {
			this.intent = "dead"
			this.#retreating = false
			this.#fullSince = -1
			return
		}
		if (me.gauge < GAUGE_FULL) this.#fullSince = -1
		else if (this.#fullSince < 0) this.#fullSince = world.tick
		if ((world.tick + me.id) % THINK_TICKS !== 0) return
		if (me.casting) {
			this.intent = "casting"
			return
		}
		const s = this.#survey()
		const plan =
			this.#dodge() ??
			this.#retreat(s) ??
			this.#evade(s) ??
			this.#fight(s) ??
			this.#committed() ??
			this.#farm(s) ??
			this.#push(s) ??
			this.#bank(s) ??
			this.#position(s)
		this.intent = plan.intent
		this.#carryOut(plan.command)
	}

	// What it sees

	#survey(): Survey {
		const { world, unit: me } = this
		let foe: Unit | null = null
		for (const hero of world.heroes) if (hero.alive && hero.team !== me.team) foe = hero
		const ownCreeps: Unit[] = []
		const enemyCreeps: Unit[] = []
		let ownTower: Unit | null = null
		let enemyTower: Unit | null = null
		const fronts: number[] = []
		let enemyFront: number | null = null
		for (const unit of world.units) {
			if (!unit.alive) continue
			if (unit.stats.structure) {
				if (unit.team === me.team) {
					if (!ownTower || this.#distance(unit) < this.#distance(ownTower)) ownTower = unit
				} else if (!enemyTower || this.#distance(unit) < this.#distance(enemyTower)) {
					enemyTower = unit
				}
			} else if (isCreep(unit.stats)) {
				const along = this.#line.along(unit.col, unit.row)
				if (unit.team === me.team) {
					ownCreeps.push(unit)
					fronts.push(along)
				} else {
					enemyCreeps.push(unit)
					enemyFront = enemyFront === null ? along : Math.min(enemyFront, along)
				}
			}
		}
		fronts.sort((a, b) => b - a)
		return {
			foe,
			ownTower,
			enemyTower,
			ownCreeps,
			enemyCreeps,
			front: fronts.length === 0 ? null : fronts[Math.min(1, fronts.length - 1)],
			enemyFront,
			ready: me.gauge >= GAUGE_FULL,
			health: me.hp / me.stats.hp
		}
	}

	#distance(other: Unit, from: Unit = this.unit): number {
		return footprintDistance(
			from.col,
			from.row,
			from.stats.radius,
			other.col,
			other.row,
			other.stats.radius
		)
	}

	#tileDistance(col: number, row: number, other: Unit): number {
		return footprintDistance(col, row, 0, other.col, other.row, other.stats.radius)
	}

	/** The hero's first usable ability with this kind of effect, if it has the MP for it. */
	#ability(kind: AbilityEffect["kind"], mp = this.unit.mp): Ability | null {
		for (const id of this.unit.hero?.job.abilities ?? []) {
			const ability = this.world.rules.abilities[id]
			if (ability.enabled && ability.effect.kind === kind && ability.mp <= mp) return ability
		}
		return null
	}

	/** Its spells it has the MP for: instant ones first. */
	#spells(): Ability[] {
		const spells = (this.unit.hero?.job.abilities ?? [])
			.map((id) => this.world.rules.abilities[id])
			.filter((a) => a.enabled && a.effect.kind === "magic" && a.mp <= this.unit.mp)
		return spells.sort((a, b) => a.charge - b.charge)
	}

	/** A caster fights from range with spells; anyone else walks up and hits. */
	#isCaster(unit: Unit): boolean {
		return (unit.hero?.job.abilities ?? []).some((id) => {
			const ability = this.world.rules.abilities[id]
			return ability.effect.kind === "magic" && ability.reach > unit.stats.reach
		})
	}

	/** The damage the hero's blow, times `power`, does to a unit. */
	#blowDamage(target: Unit, power = 1): number {
		return physicalDamage(this.unit.stats, target.stats, power, this.world.rules.tuning)
	}

	/** The damage a spell of the hero's with this power does to a unit. */
	#spellDamage(target: Unit, power: number): number {
		return magicDamage(this.unit.stats, target.stats, power, this.world.rules.tuning)
	}

	/** Whether a unit is coming for the hero: attacking it, or aiming an ability at it. */
	#chasing(unit: Unit): boolean {
		const order = unit.hero?.order
		if (!order) return unit.target === this.unit
		if (order.type === "attack") return order.target === this.unit
		return order.type === "ability" && order.aim.kind === "unit" && order.aim.unit === this.unit
	}

	/** The most damage the hero can do to a unit with one action now (not counting charged spells). */
	#burst(target: Unit): number {
		let best = this.#blowDamage(target)
		const strike = this.#ability("strike")
		if (strike?.effect.kind === "strike") {
			best = Math.max(best, this.#blowDamage(target, strike.effect.power))
		}
		for (const spell of this.#spells()) {
			if (spell.charge > 0 || spell.effect.kind !== "magic") continue
			best = Math.max(best, this.#spellDamage(target, spell.effect.power))
		}
		return best
	}

	/** Whether a Sentinel's attention is on the hero's creeps: it has one targeted, and two in reach. */
	#tanked(tower: Unit, s: Survey): boolean {
		const target = tower.target
		if (!target || target === this.unit || target.team !== this.unit.team) return false
		const inReach = s.ownCreeps.filter((c) => this.#distance(c, tower) <= tower.stats.reach)
		return inReach.length >= 2
	}

	/** Whether a tile is in (or near) the enemy Sentinel's reach. */
	#underTower(col: number, row: number, s: Survey, margin = 0): boolean {
		const tower = s.enemyTower
		return tower !== null && this.#tileDistance(col, row, tower) <= tower.stats.reach + margin
	}

	/** A tile `back` tiles further from the enemy, along the lane, than the hero. */
	#back(back: number): [number, number] {
		const me = this.unit
		return this.#line.tileAt(this.#line.along(me.col, me.row) - back)
	}

	// Decisions, most urgent first

	/** Out of the area of an enemy's charged spell, to the nearest tile outside it. */
	#dodge(): Plan | null {
		const { world, unit: me } = this
		const [col, row] = world.tileOf(me)
		for (const hero of world.heroes) {
			const casting = hero.casting
			if (!hero.alive || hero.team === me.team || !casting) continue
			const area = casting.ability.area
			if (Math.abs(col - casting.col) + Math.abs(row - casting.row) > area) continue
			const exit = this.#nearestOnRing(casting.col, casting.row, area + 1)
			if (exit) return { intent: "dodge", command: { type: "move", col: exit[0], row: exit[1] } }
		}
		return null
	}

	/** Whether a tile is in (or next to) the area of an enemy's charged spell on its way. */
	#threatened(col: number, row: number): boolean {
		for (const hero of this.world.heroes) {
			const casting = hero.casting
			if (!hero.alive || hero.team === this.unit.team || !casting) continue
			const d = Math.abs(col - casting.col) + Math.abs(row - casting.row)
			if (d <= casting.ability.area + 1) return true
		}
		return false
	}

	/** The walkable tile exactly `k` steps from (col, row) nearest the hero; ties go homeward. */
	#nearestOnRing(col: number, row: number, k: number): [number, number] | null {
		const { world, unit: me } = this
		let best: [number, number] | null = null
		let bestScore = Infinity
		for (let i = 0; i < k; i++) {
			for (const [c, r] of [
				[col + i, row + k - i],
				[col + k - i, row - i],
				[col - i, row - k + i],
				[col - k + i, row + i]
			]) {
				if (!isWalkable(world.terrain, c, r) || world.unitAt(c, r)?.stats.structure) continue
				const score = Math.abs(c - me.col) + Math.abs(r - me.row) + this.#line.along(c, r) / 1000
				if (score < bestScore) {
					best = [c, r]
					bestScore = score
				}
			}
		}
		return best
	}

	/**
	 * Low on HP: a hero with a heal uses it when hurt and ready, and when low waits behind its own
	 * Sentinel to heal; one without walks home to its Clan Hall.
	 */
	#retreat(s: Survey): Plan | null {
		const me = this.unit
		if (s.health < RETREAT_AT) this.#retreating = true
		else if (s.health >= HEALED) this.#retreating = false
		const heal = this.#ability("heal")
		// It doesn't stop to heal with the enemy hero in reach of a killing blow.
		const finishing =
			s.foe !== null &&
			this.#distance(s.foe) <= me.stats.reach + LAST_HIT_WALK &&
			s.foe.hp <= this.#burst(s.foe)
		// Retreating, it heals all the way back.
		const hurt = s.health < (this.#retreating ? HEALED : MEND_AT)
		if (heal && hurt && s.ready && !finishing) {
			return { intent: "mend", command: { type: "ability", ability: heal.id, target: null } }
		}
		if (!this.#retreating) return null
		if (heal && s.ownTower) {
			const along = this.#line.along(s.ownTower.col, s.ownTower.row) - 4
			return { intent: "retreat", command: this.#goTo(this.#line.tileAt(along)) }
		}
		const hall = me.hero?.hall
		if (!hall) return null
		return { intent: "retreat", command: this.#goTo([hall[0], hall[1]]) }
	}

	/**
	 * Out of trouble it didn't choose: an enemy Sentinel shooting at it, enemy creeps on it, or (for
	 * a caster) a melee hero closing in, which it chills first if it can.
	 */
	#evade(s: Survey): Plan | null {
		const { world, unit: me } = this
		const tower = s.enemyTower
		if (tower?.target === me && this.#distance(tower) <= tower.stats.reach + 1) {
			const out = this.#line.along(tower.col, tower.row) - tower.stats.reach - TOWER_MARGIN - 2
			return { intent: "evade", command: this.#goTo(this.#line.tileAt(out)) }
		}
		const foe = s.foe
		if (foe && this.#isCaster(me) && !this.#isCaster(foe) && this.#chasing(foe)) {
			if (this.#distance(foe) <= KITE_RANGE && foe.hp > this.#burst(foe)) {
				const chill = this.#spells().find(
					(a) =>
						a.effect.kind === "magic" &&
						a.effect.inflicts !== undefined &&
						world.rules.statuses[a.effect.inflicts.status].walk < 100
				)
				const status = chill?.effect.kind === "magic" ? chill.effect.inflicts?.status : undefined
				if (chill && status && s.ready && !world.has(foe, status)) {
					return {
						intent: "evade",
						command: { type: "ability", ability: chill.id, target: foe.id }
					}
				}
				return { intent: "evade", command: this.#goTo(this.#back(CASTER_SPACE)) }
			}
		}
		const onMe = s.enemyCreeps.filter(
			(c) => c.target === me && this.#distance(c) <= c.stats.reach + 1
		)
		if (onMe.length >= 2 && me.target !== foe && s.health < 0.75) {
			return { intent: "evade", command: this.#goTo(this.#back(4)) }
		}
		return null
	}

	/**
	 * The enemy hero: kill it when one action can, else trade when ahead (by enough of its HP, its
	 * creeps not about to join in, not under the enemy's Sentinel unless from a spell's range).
	 */
	#fight(s: Survey): Plan | null {
		const me = this.unit
		const foe = s.foe
		if (!foe) return null
		const caster = this.#isCaster(me)
		const d = this.#distance(foe)
		const kill = foe.hp <= this.#burst(foe)
		const range =
			caster ? Math.max(0, ...this.#spells().map((a) => a.reach)) + 2
			: this.#isCaster(foe) ? DIVE_RANGE
			: 8
		if (d > range) return null
		// Melee goes to the foe; a caster casts from the edge of its reach towards it.
		const reach = caster ? Math.max(0, ...this.#spells().map((a) => a.reach)) : 0
		const [col, row] = caster ? this.#castFrom(foe.col, foe.row, reach) : [foe.col, foe.row]
		const underTheirs = this.#underTower(col, row, s, 1)
		if (underTheirs && !(kill && s.health > 0.5)) return null
		const underOurs =
			s.ownTower !== null && this.#distance(foe, s.ownTower) <= s.ownTower.stats.reach
		const lead = s.health - foe.hp / foe.stats.hp
		// Under its own Sentinel, or with the foe already in reach, it needs less of a lead.
		const close = d <= me.stats.reach + 1
		const ahead = s.health >= 0.5 && lead >= AHEAD_BY - (underOurs ? 0.2 : 0) - (close ? 0.15 : 0)
		// Its creeps near the hero turn on it when it hits their hero (§6).
		const joining = s.enemyCreeps.filter((c) => this.#distance(c) <= c.stats.aggro).length
		// A melee hero's plan against a caster (§13): close in with a full gauge, and hit.
		const dive = !caster && this.#isCaster(foe) && s.ready && s.health >= DIVE_AT && joining <= 3
		if (!kill && !dive && !(ahead && joining <= 2)) return null
		if (caster && !s.ready) return null
		// A melee hero doesn't follow its foe into a charged spell's area.
		if (!caster && this.#threatened(foe.col, foe.row)) return null
		const command = this.#attackHero(foe, kill)
		return command && { intent: kill ? "kill" : "trade", command }
	}

	/** The action against the enemy hero: a caster's spell; melee, a debuff, a technique or a blow. */
	#attackHero(foe: Unit, kill: boolean): Command | null {
		const { world, unit: me } = this
		if (this.#isCaster(me)) {
			const spells = this.#spells()
			const killer = spells.find(
				(a) =>
					a.charge === 0 &&
					a.effect.kind === "magic" &&
					this.#spellDamage(foe, a.effect.power) >= foe.hp
			)
			const still = foe.casting !== null || (foe.step === null && foe.hero?.order.type !== "move")
			const spell =
				(kill ? killer : undefined) ??
				spells.find((a) => a.charge === 0 && a.area > 0) ??
				spells.find((a) => a.charge > 0 && still) ??
				spells[0]
			return spell ? { type: "ability", ability: spell.id, target: foe.id } : null
		}
		const debuff = this.#ability("debuff")
		const status = debuff?.effect.kind === "debuff" ? debuff.effect.inflicts.status : null
		if (!kill && debuff && status && !world.has(foe, status)) {
			return { type: "ability", ability: debuff.id, target: foe.id }
		}
		const strike = this.#ability("strike")
		if (strike) return { type: "ability", ability: strike.id, target: foe.id }
		return { type: "attack", target: foe.id }
	}

	/** An ability it just ordered, still on its way: it sticks to it for a moment, not to dither. */
	#committed(): Plan | null {
		const order = this.unit.hero?.order
		if (order?.type !== "ability" || this.world.tick - this.#lastAt >= ticks(COMMIT)) return null
		if (order.aim.kind === "unit" && !order.aim.unit.alive) return null
		return { intent: this.intent, command: null }
	}

	/** Last hits and denies, with a full gauge: a blow, or a spell where it pays. */
	#farm(s: Survey): Plan | null {
		const me = this.unit
		const order = me.hero?.order
		if (order?.type === "attack" && order.target.alive && isCreep(order.target.stats)) {
			const target = order.target
			if (target.hp <= this.#blowDamage(target)) {
				return { intent: target.team === me.team ? "deny" : "lastHit", command: null }
			}
		}
		if (!s.ready) return null
		const reach = me.stats.reach + LAST_HIT_WALK
		const safe = (u: Unit) =>
			!this.#threatened(u.col, u.row) &&
			(!this.#underTower(u.col, u.row, s, 1) ||
				(s.enemyTower !== null && this.#tanked(s.enemyTower, s) && s.health > 0.5))
		const blow = (u: Unit) => this.#blowDamage(u)
		const lastHit = this.#nearest(
			s.enemyCreeps.filter((c) => c.hp <= blow(c) && this.#distance(c) <= reach && safe(c))
		)
		if (lastHit) return { intent: "lastHit", command: { type: "attack", target: lastHit.id } }
		const spell = this.#bestSpell(s, 0)
		if (spell) return { intent: "lastHit", command: spell }
		// A technique, when MP would otherwise go to waste at its cap.
		const strike = this.#ability("strike")
		if (
			strike?.effect.kind === "strike" &&
			me.mp + this.world.rules.tuning.mpPerAction > me.stats.mp
		) {
			const { power } = strike.effect
			const big = this.#nearest(
				s.enemyCreeps.filter(
					(c) => c.hp <= this.#blowDamage(c, power) && this.#distance(c) <= reach && safe(c)
				)
			)
			if (big) {
				return {
					intent: "lastHit",
					command: { type: "ability", ability: strike.id, target: big.id }
				}
			}
		}
		const deny = this.#nearest(
			s.ownCreeps.filter(
				(c) => this.world.deniable(me, c) && c.hp <= blow(c) && this.#distance(c) <= reach
			)
		)
		if (deny) return { intent: "deny", command: { type: "attack", target: deny.id } }
		return null
	}

	/**
	 * The best spell to cast now and where, valuing gold from kills, damage to the enemy hero, and
	 * `creepDamage` gold a point of other damage; null when nothing is worth its MP.
	 */
	#bestSpell(s: Survey, creepDamage: number): Command | null {
		const { world, unit: me } = this
		const foe = s.foe
		const trading = foe !== null && s.health - foe.hp / foe.stats.hp >= 0
		let best: Command | null = null
		let bestValue = 0
		for (const spell of this.#spells()) {
			if (spell.effect.kind !== "magic") continue
			const { power } = spell.effect
			const charged = spell.charge > 0
			const value = (col: number, row: number): number => {
				let gold = 0
				for (const e of s.enemyCreeps) {
					const [c, r] = world.tileOf(e)
					if (Math.abs(c - col) + Math.abs(r - row) > spell.area) continue
					// A charged spell lands where they stand: walkers will have gone.
					if (charged && e.step) continue
					const damage = this.#spellDamage(e, power)
					const hp = charged ? e.hp - CHARGE_ATTRITION : e.hp
					gold += damage >= hp ? e.stats.bounty : damage * creepDamage
				}
				if (foe && (trading || charged)) {
					const [c, r] = world.tileOf(foe)
					if (Math.abs(c - col) + Math.abs(r - row) <= spell.area) {
						const damage = this.#spellDamage(foe, power)
						const still = foe.casting !== null || foe.step === null
						gold +=
							damage >= foe.hp ? world.rules.tuning.heroBounty
							: charged ? (still ? 0.5 : 0) * damage * HERO_DAMAGE_GOLD
							: damage * HERO_DAMAGE_GOLD
					}
				}
				return gold
			}
			const worth = SPELL_WORTH * (charged ? 2 : 1)
			const consider = (col: number, row: number, target: Unit | null) => {
				if (Math.abs(col - me.col) + Math.abs(row - me.row) > spell.reach + 2) return
				if (this.#underTower(...this.#castFrom(col, row, spell.reach), s, 0)) return
				const v = value(col, row)
				if (v < worth || v - spell.mp <= bestValue) return
				bestValue = v - spell.mp
				best =
					target && spell.target === "enemy" ?
						{ type: "ability", ability: spell.id, target: target.id }
					:	{ type: "abilityAt", ability: spell.id, col, row }
			}
			const seen = new Set<number>()
			const targets = foe ? [...s.enemyCreeps, foe] : s.enemyCreeps
			for (const e of targets) {
				const [c, r] = world.tileOf(e)
				if (spell.area === 0 || spell.target === "enemy") {
					consider(c, r, e)
					continue
				}
				const k = Math.min(spell.area, 2)
				for (let dc = -k; dc <= k; dc++) {
					for (let dr = Math.abs(dc) - k; dr <= k - Math.abs(dc); dr++) {
						const key = (c + dc) * 4096 + (r + dr)
						if (seen.has(key)) continue
						seen.add(key)
						consider(c + dc, r + dr, null)
					}
				}
			}
		}
		return best
	}

	/** Where the hero would cast at a tile from: where it is, or the edge of its reach towards it. */
	#castFrom(col: number, row: number, reach: number): [number, number] {
		const me = this.unit
		const d = Math.abs(col - me.col) + Math.abs(row - me.row)
		if (d <= reach) return [me.col, me.row]
		const t = (d - reach) / d
		return [Math.round(me.col + (col - me.col) * t), Math.round(me.row + (row - me.row) * t)]
	}

	#nearest(units: readonly Unit[]): Unit | null {
		let best: Unit | null = null
		for (const u of units) {
			if (
				!best ||
				this.#distance(u) < this.#distance(best) ||
				(this.#distance(u) === this.#distance(best) && u.hp < best.hp)
			) {
				best = u
			}
		}
		return best
	}

	/**
	 * The enemy hero is dead or far: clear the wave (spells on anything they hurt, blows on the
	 * weakest creep near) and hit the Sentinel while its creeps hold its aggro.
	 */
	#push(s: Survey): Plan | null {
		const me = this.unit
		if (s.foe && this.#distance(s.foe) <= PUSH_DISTANCE) return null
		if (!s.ready) return null
		if (this.#isCaster(me)) {
			const spell = this.#bestSpell(s, 0.1)
			return spell && { intent: "push", command: spell }
		}
		const siege = this.#siege(s)
		if (siege) return siege
		const weakest = s.enemyCreeps
			.filter(
				(c) => this.#distance(c) <= me.stats.reach + 4 && !this.#underTower(c.col, c.row, s, 1)
			)
			.sort((a, b) => a.hp - b.hp)[0]
		return weakest ? { intent: "push", command: { type: "attack", target: weakest.id } } : null
	}

	/** A blow on the enemy Sentinel, for a hero that can hurt it, while its creeps hold its aggro. */
	#siege(s: Survey): Plan | null {
		const tower = s.enemyTower
		if (!tower || this.#isCaster(this.unit) || !this.#tanked(tower, s) || s.health <= 0.5) {
			return null
		}
		if (s.enemyCreeps.some((c) => this.#distance(c, tower) <= 4)) return null
		return { intent: "siege", command: { type: "attack", target: tower.id } }
	}

	/**
	 * A full gauge held too long with nothing to spend it on, while short of MP for its abilities
	 * or capped: a blow on a creep (or the Sentinel, while its creeps hold it), for the MP or the
	 * push.
	 */
	#bank(s: Survey): Plan | null {
		const me = this.unit
		if (!s.ready || this.#fullSince < 0) return null
		if (this.world.tick - this.#fullSince < ticks(BANK_AFTER)) return null
		const most = Math.max(
			0,
			...(me.hero?.job.abilities ?? []).map((id) => {
				const ability = this.world.rules.abilities[id]
				return ability.enabled ? ability.mp : 0
			})
		)
		const capped = me.mp + this.world.rules.tuning.mpPerAction > me.stats.mp
		if (me.mp >= most && !capped) return null
		const siege = this.#siege(s)
		if (siege) return siege
		// A caster stands back from its wave, so it walks that much further.
		const reach = me.stats.reach + LAST_HIT_WALK + (this.#isCaster(me) ? BEHIND_CASTER : 0)
		const deny = this.#nearest(
			s.ownCreeps.filter((c) => this.world.deniable(me, c) && this.#distance(c) <= reach)
		)
		const creep =
			deny ??
			this.#nearest(
				s.enemyCreeps.filter(
					(c) => this.#distance(c) <= reach && !this.#underTower(c.col, c.row, s, 1)
				)
			)
		return creep && { intent: "bank", command: { type: "attack", target: creep.id } }
	}

	/**
	 * Its spot in the lane. While its wave fights, behind the wave's front (close for melee, back
	 * for a caster), never in front of the enemy's creeps. Otherwise it waits for its next wave
	 * out of the enemy creeps' aggro (a melee hero where it is, a caster as near as that allows)
	 * and no further back than its own Sentinel, or follows its wave forward. Never in the enemy Sentinel's reach, unless it can hurt the
	 * Sentinel and its creeps hold it.
	 */
	#position(s: Survey): Plan {
		const me = this.unit
		const line = this.#line
		const caster = this.#isCaster(me)
		const here = line.along(me.col, me.row)
		const behind = s.front === null ? -Infinity : s.front - (caster ? BEHIND_CASTER : BEHIND_MELEE)
		const engaged = s.front !== null && s.enemyFront !== null && s.enemyFront - s.front <= 10
		let along: number
		if (engaged && s.enemyFront !== null) {
			along = Math.min(behind, s.enemyFront - (caster ? 7 : 1))
		} else {
			// A caster closes to just outside the enemy creeps' aggro, inside its spells' reach.
			let wait =
				s.enemyFront === null ? here
				: caster ? s.enemyFront - AGGRO_GAP
				: Math.min(here, s.enemyFront - AGGRO_GAP)
			if (s.ownTower) wait = Math.max(wait, line.along(s.ownTower.col, s.ownTower.row) - 2)
			along = Math.max(behind, wait)
		}
		// Only a hero that can hurt the Sentinel goes in, while its creeps hold it; nobody goes past
		// it (the way there runs through its reach).
		const tower = s.enemyTower
		const sieging = !caster && tower !== null && this.#tanked(tower, s) && s.health > 0.5
		if (tower && !sieging) along = Math.min(along, line.along(tower.col, tower.row))
		let tile = line.tileAt(along)
		while (along > 0 && !sieging && this.#underTower(tile[0], tile[1], s, TOWER_MARGIN)) {
			along -= 1
			tile = line.tileAt(along)
		}
		const foe = s.foe
		if (caster && foe && !this.#isCaster(foe)) {
			while (along > 0 && this.#tileDistance(tile[0], tile[1], foe) < CASTER_SPACE) {
				along -= 1
				tile = line.tileAt(along)
			}
		}
		// Near enough its spot, along the lane and across it, it stays put.
		const order = me.hero?.order
		if (Math.abs(here - along) <= SLACK && line.offset(me.col, me.row) <= LANE_WIDTH) {
			if (order?.type === "idle") return { intent: "lane", command: null }
			if (order?.type !== "move") return { intent: "lane", command: { type: "stop" } }
		}
		return { intent: "lane", command: this.#goTo(tile) }
	}

	/**
	 * A move to a tile, or null when the hero is (or is on its way to) within `SLACK` of it; a stop
	 * when it's there but doing something else.
	 */
	#goTo([col, row]: readonly [number, number]): Command | null {
		const me = this.unit
		const order = me.hero?.order
		const near = (c: number, r: number) => Math.abs(c - col) + Math.abs(r - row) <= SLACK
		if (order?.type === "move" && near(order.col, order.row)) return null
		if (near(me.col, me.row)) return order?.type === "idle" ? null : { type: "stop" }
		return { type: "move", col, row }
	}

	// Commands

	/** Gives a command, unless it's the last one given and the hero is still carrying it out. */
	#carryOut(command: Command | null) {
		if (!command) return
		const order = this.unit.hero?.order
		if (!order) return
		const key = JSON.stringify(command)
		if (key === this.#last && HeroAI.#inHand(command, order)) return
		this.#last = key
		this.#lastAt = this.world.tick
		this.world.command(this.unit.id, command)
	}

	/** Whether an order is what a command gave. */
	static #inHand(command: Command, order: Order): boolean {
		switch (command.type) {
			case "stop":
				return order.type === "idle"
			case "move":
			case "attackMove":
				return order.type === command.type || order.type === "idle"
			case "attack":
				return order.type === "attack" && order.target.id === command.target
			case "ability":
			case "abilityAt":
				return order.type === "ability" && order.ability.id === command.ability
		}
	}
}
