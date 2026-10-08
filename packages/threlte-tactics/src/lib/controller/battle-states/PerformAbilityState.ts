import { nextFrame } from "#lib/common/unity/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import type { BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/PerformAbilityState.cs` as of the magic part: uses the action,
 * performs the ability on the targets a frame later, then carries on with the turn.
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

	function applyAbility(): void {
		turn.ability!.perform(turn.targets)
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
