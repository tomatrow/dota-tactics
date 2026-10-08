import type { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { BaseException } from "./BaseException.ts"

/**
 * Port of `Exceptions/MatchException.cs`: an exception to a rule about two units, e.g. that an
 * attack can miss. Off by default.
 */
export class MatchException extends BaseException {
	readonly attacker: Unit
	readonly target: Unit

	constructor(attacker: Unit, target: Unit) {
		super(false)
		this.attacker = attacker
		this.target = target
	}
}
