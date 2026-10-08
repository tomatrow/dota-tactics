import { BlindStatusEffect } from "./BlindStatusEffect.ts"
import { HasteStatusEffect } from "./HasteStatusEffect.ts"
import { KnockOutStatusEffect } from "./KnockOutStatusEffect.ts"
import { PoisonStatusEffect } from "./PoisonStatusEffect.ts"
import { SlowStatusEffect } from "./SlowStatusEffect.ts"
import type { StatusEffectType } from "./StatusEffect.ts"
import { StopStatusEffect } from "./StopStatusEffect.ts"

/** The status effects by class name, for Unity's `Type.GetType(statusName)`. */
export const statusEffectTypes = {
	BlindStatusEffect,
	HasteStatusEffect,
	KnockOutStatusEffect,
	PoisonStatusEffect,
	SlowStatusEffect,
	StopStatusEffect
} satisfies Record<string, StatusEffectType>

export type StatusEffectName = keyof typeof statusEffectTypes
