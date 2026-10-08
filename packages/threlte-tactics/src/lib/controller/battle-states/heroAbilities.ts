import type {
	AbilityEffectPrefab,
	AbilityPrefab
} from "#lib/view-model-component/ability/AbilityPrefab.ts"

// The abilities on the blog's Hero prefab as of the magic part: its "Attack" child and its
// "Ability Catalog" (the same abilities as the final game's `Resources/Abilities` prefabs).
// TODO(part 21): spawned units get their abilities from `Resources/Abilities` instead.

const vertical = 2_147_483_647

const damage = (
	hitRate: AbilityEffectPrefab["hitRate"]["type"],
	target: AbilityEffectPrefab["target"]
): AbilityEffectPrefab => ({
	name: "Damage",
	hitRate: { type: hitRate },
	target,
	effect: { type: "DamageAbilityEffect" }
})

const defaultTarget = { type: "DefaultAbilityEffectTarget" } as const
const living = { type: "UndeadAbilityEffectTarget", toggle: false } as const
const undead = { type: "UndeadAbilityEffectTarget", toggle: true } as const

const heal: AbilityEffectPrefab = {
	name: "Heal",
	hitRate: { type: "FullTypeHitRate" },
	target: living,
	effect: { type: "HealAbilityEffect" }
}

export const attack: AbilityPrefab = {
	name: "Attack",
	power: { type: "PhysicalAbilityPower", level: 45 },
	range: { type: "ConstantAbilityRange", horizontal: 3, vertical },
	area: { type: "SpecifyAbilityArea", horizontal: 1, vertical: 1 },
	children: [damage("ATypeHitRate", defaultTarget)]
}

export const abilityCatalog: { name: string; abilities: AbilityPrefab[] }[] = [
	{
		name: "White Magic",
		abilities: [
			{
				name: "Cure",
				power: { type: "MagicalAbilityPower", level: 40 },
				range: { type: "ConstantAbilityRange", horizontal: 4, vertical },
				area: { type: "SpecifyAbilityArea", horizontal: 1, vertical: 1 },
				magicCost: 6,
				children: [heal, damage("ATypeHitRate", undead)]
			},
			{
				name: "Raise",
				power: { type: "PhysicalAbilityPower", level: 45 },
				range: { type: "ConstantAbilityRange", horizontal: 4, vertical },
				area: { type: "SpecifyAbilityArea", horizontal: 1, vertical: 2 },
				magicCost: 22,
				children: [
					heal,
					damage("ATypeHitRate", undead),
					{
						name: "Revive",
						hitRate: { type: "FullTypeHitRate" },
						target: { type: "KOdAbilityEffectTarget" },
						effect: { type: "ReviveAbilityEffect", percent: 0.25 }
					}
				]
			},
			{
				name: "Holy",
				power: { type: "MagicalAbilityPower", level: 50 },
				range: { type: "ConstantAbilityRange", horizontal: 3, vertical },
				area: { type: "SpecifyAbilityArea", horizontal: 1, vertical: 1 },
				magicCost: 32,
				children: [damage("ATypeHitRate", defaultTarget)]
			}
		]
	},
	{
		name: "Sagacity Skill",
		abilities: [
			{
				name: "Water",
				power: { type: "MagicalAbilityPower", level: 34 },
				range: { type: "ConstantAbilityRange", horizontal: 3, vertical },
				area: { type: "SpecifyAbilityArea", horizontal: 1, vertical: 2 },
				magicCost: 12,
				children: [damage("ATypeHitRate", defaultTarget)]
			},
			{
				name: "Blind",
				range: { type: "ConstantAbilityRange", horizontal: 4, vertical },
				area: { type: "UnitAbilityArea" },
				magicCost: 12,
				children: [
					{
						name: "Inflict Blind",
						hitRate: { type: "STypeHitRate" },
						target: defaultTarget,
						effect: { type: "InflictAbilityEffect", statusName: "BlindStatusEffect", duration: 10 }
					}
				]
			},
			{
				name: "Drain",
				power: { type: "MagicalAbilityPower", level: 30 },
				range: { type: "ConstantAbilityRange", horizontal: 4, vertical },
				area: { type: "UnitAbilityArea" },
				magicCost: 12,
				children: [
					damage("ATypeHitRate", defaultTarget),
					{
						name: "Absorb",
						hitRate: { type: "FullTypeHitRate" },
						target: defaultTarget,
						effect: { type: "AbsorbDamageAbilityEffectTarget", trackedSiblingIndex: 0 }
					}
				]
			}
		]
	}
]
