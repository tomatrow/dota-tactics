/** Port of `Enums/Drivers.cs`: who controls a unit, a person or the computer. */
export const Drivers = {
	None: 0,
	Human: 1,
	Computer: 2
} as const

export type Drivers = (typeof Drivers)[keyof typeof Drivers]
