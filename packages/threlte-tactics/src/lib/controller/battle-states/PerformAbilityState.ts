import { nextFrame } from "#lib/common/unity/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/PerformAbilityState.cs` as of the ability effects part: uses
 * the action, applies the ability's effects to each target a frame later, then carries on with
 * the turn.
 */
// TODO(part 22): end the battle once it's over, and skip a knocked out actor's facing.
export function performAbilityState(owner: BattleController) {
	const { turn } = owner

	async function animate(): Promise<void> {
		// TODO play animations, etc
		await nextFrame()
		applyAbility()
		owner.machine.done()
	}

	// TODO(part 20): `turn.ability.perform(turn.targets)`.
	function applyAbility(): void {
		for (const target of turn.targets)
			for (const child of turn.ability!.effects) child.effect.apply(target)
	}

	return {
		_enter() {
			turn.hasUnitActed = true
			if (turn.hasUnitMoved) turn.lockMove = true
			void animate()
		},
		done: () => (turn.hasUnitMoved ? "EndFacingState" : "CommandSelectionState")
	} satisfies BattleStateHandlers
}
