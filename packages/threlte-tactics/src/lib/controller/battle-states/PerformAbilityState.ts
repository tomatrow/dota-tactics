import { nextFrame } from "#lib/common/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { KnockOutStatusEffect } from "#lib/view-model-component/status/effects/KnockOutStatusEffect.ts"
import { isBattleOver, type BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/PerformAbilityState.cs`: uses the action, performs the ability
 * on the targets a frame later, then carries on: to the outro if that decided the battle, to the
 * next turn if it knocked the actor out, or back to the actor's turn.
 */
export function performAbilityState(owner: BattleController) {
	const { turn } = owner

	async function animate(): Promise<void> {
		// No animations yet: the ability applies a frame later.
		await nextFrame()
		applyAbility()
		owner.machine.done()
	}

	function applyAbility(): void {
		turn.ability!.perform(turn.targets)
	}

	function unitHasControl(): boolean {
		return turn.actor!.status.getEffect(KnockOutStatusEffect) === null
	}

	return {
		_enter() {
			turn.hasUnitActed = true
			if (turn.hasUnitMoved) turn.lockMove = true
			void animate()
		},
		done() {
			if (isBattleOver(owner)) return "CutSceneState"
			else if (!unitHasControl()) return "SelectUnitState"
			else if (turn.hasUnitMoved) return "EndFacingState"
			else return "CommandSelectionState"
		}
	} satisfies BattleStateHandlers
}
