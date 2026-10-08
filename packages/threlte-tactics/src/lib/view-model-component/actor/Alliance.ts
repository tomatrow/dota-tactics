import { Alliances } from "#lib/enums/Alliances.ts"
import { Targets } from "#lib/enums/Targets.ts"

/** Port of `View Model Component/Actor/Alliance.cs`: the side of the battle a unit is on. */
export class Alliance {
	type: Alliances
	confused = false

	constructor(type: Alliances = Alliances.None) {
		this.type = type
	}

	isMatch(other: Alliance, targets: Targets): boolean {
		let isMatch = false
		switch (targets) {
			case Targets.Self:
				isMatch = other === this
				break
			case Targets.Ally:
				isMatch = this.type === other.type
				break
			case Targets.Foe:
				isMatch = this.type !== other.type && other.type !== Alliances.Neutral
				break
		}
		return this.confused ? !isMatch : isMatch
	}
}
