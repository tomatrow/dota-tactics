import { Alliances } from "#lib/enums/Alliances.ts"
import { BaseVictoryCondition } from "./BaseVictoryCondition.ts"

/**
 * Port of `Controller/Victory Conditions/DefeatAllEnemiesVictoryCondition.cs`: the heroes win by
 * defeating every enemy.
 */
export class DefeatAllEnemiesVictoryCondition extends BaseVictoryCondition {
	protected override checkForGameOver(): void {
		super.checkForGameOver()
		if (this.victor === Alliances.None && this.partyDefeated(Alliances.Enemy))
			this.victor = Alliances.Hero
	}
}
