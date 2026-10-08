import { Alliances } from "#lib/enums/Alliances.ts"
import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { BaseVictoryCondition } from "./BaseVictoryCondition.ts"

/**
 * Port of `Controller/Victory Conditions/DefeatTargetVictoryCondition.cs`: the heroes win by
 * defeating `target`, whoever else is left.
 */
export class DefeatTargetVictoryCondition extends BaseVictoryCondition {
	target: Unit | null = null

	protected override checkForGameOver(): void {
		super.checkForGameOver()
		if (this.victor === Alliances.None && this.isDefeated(this.target!))
			this.victor = Alliances.Hero
	}
}
