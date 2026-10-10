# dota-tactics — design

Final Fantasy Tactics Advance (FFTA / FFTA2) rules on the real Dota 2 map, with Dota's lanes,
creeps, structures and win condition. One hero per player, real-time with an ATB gauge.

This is the living design doc. Decisions are marked **decided**; everything else is a proposal.
Numbers are v0 and expected to change once the prototype is playable.

Related packages: [`dota-cartographer`](../dota-cartographer) (map extraction),
[`dota-tactics-grid`](../dota-tactics-grid) (3D board viewer),
[`threlte-tactics`](../threlte-tactics) (FFT-style engine port).

---

## 1. Pillars

- **It is the Dota map.** Every 64-unit tile, tree, cliff and structure comes from `dota_map.json`.
  Nothing is hand-placed.
- **It plays like FFTA.** Races × jobs, abilities learned from equipment, facing, height, charge-time
  spells, reaction/support abilities, MP from zero.
- **It is won like Dota.** Lanes, 30-second waves, towers, barracks, the Ancient, neutrals, Roshan,
  day/night, respawn timers, buyback.
- **Nobody waits.** Real-time with an ATB gauge. Turn structure survives per unit, not per table.

## 2. Decided

| Area | Decision |
| --- | --- |
| Players | One hero per player. 5v5 is the target; single-player and 1v1 first. |
| Match length | ~30 minutes. |
| Map | Full Dota map, 64u cells, 296×296. FFTA ranges scaled ~2.5× to fit. |
| Clock | Real-time. Each unit has an ATB gauge (§3). |
| Movement | Continuous, click-to-move, Dota-ish speed. **The gauge does not charge while walking.** |
| Rules base | FFTA / FFTA2. Facing as evasion, equipment teaches abilities, A2 MP regen. |
| Jobs | Race + job fixed at draft. No mid-match job changes. |
| Laws / Judges | **Not** included. Judge Points as a team resource may stay (§9). |
| Creeps | Full units, same rules as heroes, no abilities. Denies in. (§6) |
| Win | Destroy the enemy Ancient. |

## 3. Clock: ATB

Every unit has a gauge 0–100 that fills at `speed` points per second **while the unit is standing
still**. At 100 the unit may act. Acting resets the gauge to 0.

- Baseline `speed` 20 → one action per 5s. Ninja/Assassin ~28 (3.6s), Defender ~15 (6.7s).
- A full gauge holds; nothing is lost by thinking except time. No overflow / banked turns.
- Walking charges at 0–25% rate (tune in prototype; start at 0).
- Non-player units (creeps, towers, neutrals) act the instant they fill.
- Simultaneous fills resolve by fill timestamp, then speed, then team. Deterministic for netcode.

Why "no charge while walking": it reproduces FFT's move-or-wait trade-off continuously.
Every tile stepped is time not charging. The chaser arrives with an empty gauge; the person who
stops first acts first. Melee must move to reach, ranged may stand and charge — Dota's
melee/ranged gap from one rule. Kiting is step-stop-act.

Risk to watch: fights degenerate into statues. Counters already in the rules: charge-time AoE
aimed at tiles punishes standing still; facing punishes it from behind.

### Actions

One action = attack, ability, item, or a free re-face. There is no "move" action.

- **Instant abilities** resolve on use.
- **Charge-time abilities** (FFTA spells) enter the world with their own timer and a visible bar
  over the caster, resolving on target tiles when it fills. Stun interrupts. This is Dota
  channeling and FFTA charging at once. 2–6s.
- **Reaction abilities** (Counter, Reflex, Auto-Potion…) trigger on being hit, no gauge cost.

### Facing

FFTA rule, 4-way: front = full evasion, sides = half, back = none. Damage is unaffected.
Facing auto-sets toward the last target or walk direction; re-facing is free at the end of an
action. Magic ignores facing (except by reaction abilities), as in FFTA.

Emergent: standing inside an enemy creep wave means you are flanked. Pulling creep aggro onto an
enemy hero turns off their evasion.

### MP

FFTA2 rule: start at 0, +10 per **action taken** (not per second, or standing still double-dips).
Mages scale with fight length: early skirmishes are melee, by the fourth action the Black Mage has
Firaga. Ethers for burst mana.

## 4. Scale

Gameplay cell = render cell = 64 Dota units. FFTA's numbers are treated as *ratios*
(melee 1 : bow 4 : tower 6 : move 4) and scaled ~2.5×.

![tile size](docs/tile-size.png)

Measured on the extracted map (straight line; real paths ~20–30% longer):

| Distance | Units | Tiles | Hero @300u/s |
| --- | ---: | ---: | ---: |
| Fountain → own T1 mid | 8,095 | 126 | 27s |
| Fountain → own T1 safe lane | 12,329 | 193 | 41s |
| T1 → enemy T1, mid | 2,919 | 46 | 10s |
| T1 → enemy T1, side lane | ~4,350 | ~68 | ~15s |
| Fountain → map centre | 10,185 | 159 | 34s |
| Fountain → enemy Ancient | 17,638 | 276 | 59s |
| T1 top → T1 bot (rotation) | 13,898 | 217 | 46s |
| Fountain → Roshan | 11,111 | 174 | 37s |
| Full creep lane path, mid | 13,500 | 211 | 42s @325 |
| Full creep lane path, side | ~21,000 | ~330 | ~65s @325 |

Rejected alternatives, for the record:

- **128u gameplay cells.** FFTA numbers fit unchanged, but trees/cliffs lose 64u-wide jukes and
  ramps, ranges quantise badly (tower 700u and attack 600u both round to 5), and heights need
  resampling. Decided against because the exact map is the point.
- **Turn-based movement (FFTA move 4 per turn).** 0.8 tiles/s vs Dota's 4.7. Fountain to safe
  lane = 4 minutes. Dead on arrival at map scale.
- **"March mode"** (real-time out of combat, grid turns in combat). Two movement systems, a
  gameable boundary, and chases become impossible. Superseded by the gauge rule.

## 5. Number sheet, v0

All tiles are 64u. Speeds in gauge points/sec.

| Thing | Dota units | Tiles | Notes |
| --- | ---: | ---: | --- |
| Melee reach | 150 | 2 | adjacent + 1, diagonals reachable |
| Ranged attack, base | 600 | 9 | Sniper / Archer +2–3 |
| Tower range | 700 | 11 | |
| Tower aggro / backdoor radius | 900 | 14 | |
| Creep aggro | 500 | 8 | |
| Spell range | 600–900 | 9–14 | Fire 10, Cure 8, Haste 8 |
| AoE radius | 250–400 | 4–6 | Firaga r4, Quake r6 |
| XP share radius | 1,300 | 20 | |
| Hero walk, Move 3 / 4 / 5 | 225 / 300 / 385 u/s | 3.5 / 4.7 / 6 tiles/s | |
| Creep walk | 325 u/s | 5 tiles/s | |
| Gauge fill, speed 20 | — | 5s | |
| Charge-time spells | — | 2–6s | |
| Creep wave | every 30s | — | |
| Respawn | 10 + 3×level s | — | buyback for gold |
| Day / night | 5 min | — | |

## 6. Creeps

A creep is a full unit: tile, HP, gauge, facing, team. ~90 lane creeps and ~80 neutrals alive
at once is fine. Pathing is a flow field per lane, precomputed from the cartographer waypoints
over the walkable layer.

### AI

1. Walk the lane flow field.
2. Enemy within 8 tiles → stop, pick target. Dota priority: enemy hero attacking a friendly hero
   > nearest creep > nearest hero > tower.
3. Charge (same rule as heroes: only while standing, so first attack lands ~3s after contact).
   At full, attack. Re-evaluate.
4. No enemy in 8 tiles → resume walking.

Hitting an enemy hero near creeps pulls their aggro — Dota's main laning tool, kept exactly.

### Waves

- Every 30s per lane: 3 melee, 1 ranged. Siege every 5th wave (every 2nd late).
- Stat growth every 7.5 min, as Dota.
- Barracks down → super creeps in that lane; all six → megas.
- Waves meet in the river at ~0:35 mid, ~0:55 side lanes.
- Tuning target: equal waves with no heroes resolve in ~30s, so the next wave arrives into a
  finishing fight and lane equilibrium works. Creep attack cadence ~3s.

### Identity

Creeps are FFTA monster families. Radiant: Sprites (ranged), Goblins (melee), Antlion siege.
Dire: Zombies / Ghosts (melee), Red Caps (ranged), Flan siege. Dire creeps are undead: Holy and
Cure damage them. Megas are the "Dark" variant of each family. Hunter's monster-family bonuses
apply.

**No creep abilities** (decided). Blue Mage learns from neutrals and Roshan only — the jungle is
the Blue Mage lane.

### Economy

- **Gold**: last hit only. Dota values (melee ~36, ranged ~45, siege ~70).
- **XP**: shared within 20 tiles of a creep death. Levels drive stats.
- **AP**: not from creeps. See §8.
- **Deny** (decided): attack own creep under 50%. Enemy gets reduced XP, no gold. Costs a full
  action — a real sacrifice.

Last-hit reading: creep HP falls on *other* creeps' gauges; the skill is "will it still be alive
when my gauge fills."

### Collision

FFTA rule: walk through allies, never stop on them; enemies block. The enemy wave is a wall a
melee hero must go around (lanes are 8–15 tiles wide). Steps cost gauge, so going around is a
real cost.

### Neutrals

28 camps from the map data, each an FFTA monster family (Wolves, Bombs, Lamia, Malboro for
ancients…). Same AI, leashed to spawn. Respawn each minute if the camp area is empty, so
stacking works as in Dota. Hooks: Beastmaster / Morpher dominate (Chen), Blue Mage learns,
Hunter bonuses. Roshan is a boss family; Aegis = one Auto-Life. Tormentor = a Bomb that reflects.

## 7. Races × jobs = the hero pool

Race-locked jobs give a draft roster for free. "Pick a hero" = pick race + job.

| Race | Dota shape | Jobs of note |
| --- | --- | --- |
| Bangaa | Strength cores | Warrior, Defender, Dragoon, Gladiator, Templar (Omniknight) |
| Viera | Agility carries, burst | Assassin (Riki), Sniper, Red Mage, Summoner (scion ults) |
| Nu Mou | Intelligence | Black / Time Mage, Sage, Alchemist (support items), Beastmaster / Morpher (Chen, Enchantress) |
| Moogle | Utility, odd | Gunner, Gadgeteer (Chaos Knight), Juggler, Animist, Mog Knight, Thief (gold-steal ganker) |
| Hume | Flex | Soldier, Paladin, Fighter, Hunter (monster-family damage), Blue Mage (learns from neutrals) |
| Seeq (A2) | Greedy brawlers | Viking, Berserker, Ranger (traps = wards / mines) |
| Gria (A2) | Fliers | Raptor, Ravager, Geomancer (terrain, trees) |

Clan titles / privileges → per-match talent tree at levels 10/15/20/25.

## 8. Equipment, abilities, AP

FFTA's core loop: equip gear that teaches an ability, earn AP, master it, keep it. This **is**
Dota's item system with a learning curve.

- The shop sells FFTA gear. Blink Dagger teaches Blink; master it, sell the dagger, buy a BKB.
- Gold does double duty: stats now, abilities permanently. Early items are "what do I want
  mastered by minute 15."
- **AP accrues per action you take** while wearing the item (+ bonus on kill / assist). Not
  from farm, so a support that acts constantly masters items as fast as a farmed carry.
- Bazaar / Smith crafting = Dota recipes.
- TP scroll is an item that teaches Teleport (3s channel to a friendly structure). Prototype:
  everyone has one on cooldown.
- Dispatch missions → couriers.

Open: item list, what teaches what, AP costs, where you can buy (fountain only / side shops).

## 9. Structures and the Dota layer

- **Towers**: units with speed ~25, range 11, big damage, no move. Dota aggro rules (prefers a
  hero who attacked a hero). Backdoor regen when no enemy creep within 14 tiles.
- **Barracks / Ancient**: units with HP. Ancient is the win condition.
- **Day / night** every 5 min; affects vision.
- **Death**: countdown, buyback for gold. Possible: Rubick-style "take an ability from the
  corpse" — not decided.
- **Judge Points** (A2): earned by acting and killing, spent on Combos and Scion summons.
  Proposal: team-shared ult gauge. Roshan grants a large chunk.
- **Vision / fog**: FFTA has none. Trees block, height uplifts, wards are items. Undesigned.

## 10. Prototype slice

One lane (mid). Two T1 towers. Waves. Two heroes: **Bangaa Warrior** vs **Nu Mou Black Mage**,
mage starts at 0 MP, each with one piece of gear teaching one ability. Win = kill the far tower.

It answers the only two questions that need play to answer:

1. Does one action per ~5s feel tense or laggy?
2. Does "walking stops your gauge" produce kiting, or statues?

Levers if it's laggy: higher base speed, larger walk speed, partial charge while walking.

## 11. Open

In rough order of how much they shape the prototype:

1. Starter kits for Warrior and Black Mage at scaled numbers (HP, attack, speed, move, gear, MP).
2. Towers: damage, priority, glyph or not.
3. Shop and AP economy (§8).
4. Vision and fog of war.
5. Judge Points / Scions / Combos in real time.
6. Networking model (deterministic sim is the goal; fill-order rule in §3 is for this).
