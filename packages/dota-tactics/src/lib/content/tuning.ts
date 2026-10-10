/** Rules numbers that aren't a unit's stats (DESIGN.md §3, §6, §12). */
export const TUNING = {
	/** Seconds between waves in each lane. */
	waveInterval: 30,
	/** Every this many waves brings a siege creep. */
	siegeEvery: 5,
	/** Percent of its speed a unit charges while walking (§3: start at 0). */
	walkCharge: 0,
	/** Hit chance before evasion (§12). */
	baseHit: 95,
	/** Hit chance lost attacking a target on higher ground (§12). */
	uphillMiss: 25,
	/** Damage never falls below this percent of ATK (§12). */
	minDamage: 10,
	/** Creeps keep within this many tiles of their lane's path when they can. */
	laneCorridor: 4,
	/** MP every action gives, abilities included (§3). */
	mpPerAction: 10,
	/** A dead hero is back after this many seconds, plus `respawnPerLevel` per level (§5). */
	respawnBase: 10,
	respawnPerLevel: 3,
	/** A hero may deny its own creep under this percent of its HP (§6). */
	denyBelow: 50
} as const
