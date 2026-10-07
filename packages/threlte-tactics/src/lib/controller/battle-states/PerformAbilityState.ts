import { nextFrame } from "#lib/common/unity/time.ts"
import type { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import type { BattleStateHandlers } from "./BattleState.ts"

/**
 * Port of `Controller/Battle States/PerformAbilityState.cs` as of the area of effect part: uses
 * the action, applies a placeholder attack a frame later, then carries on with the turn.
 */
// TODO(part 19): apply the ability's effects. TODO(part 22): end the battle once it's over.
export function performAbilityState(owner: BattleController) {
	const { turn } = owner

	async function animate(): Promise<void> {
		// TODO play animations, etc
		await nextFrame()
		// TODO apply ability effect, etc
		temporaryAttackExample()
		owner.machine.done()
	}

	function temporaryAttackExample(): void {
		for (const target of turn.targets) {
			const obj = target.content
			const stats = obj !== null ? obj.stats : null
			if (stats !== null) {
				stats.set(StatTypes.HP, stats.get(StatTypes.HP) - 50)
				if (stats.get(StatTypes.HP) <= 0) console.log("KO'd Uni!", obj)
			}
		}
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
