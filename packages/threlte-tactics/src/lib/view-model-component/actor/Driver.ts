import { Drivers } from "#lib/enums/Drivers.ts"

/**
 * Port of `View Model Component/Actor/Driver.cs`: who controls a unit. `normal` is set when the
 * unit is made; `special` would override it (nothing sets it yet, e.g. a charm status).
 */
export class Driver {
	normal: Drivers = Drivers.None
	special: Drivers = Drivers.None

	get current(): Drivers {
		return this.special !== Drivers.None ? this.special : this.normal
	}
}
