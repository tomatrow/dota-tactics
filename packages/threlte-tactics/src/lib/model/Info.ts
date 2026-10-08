/**
 * Port of `Model/Info.cs`: a notification's arguments, which listeners may change. (Unity also
 * has one- and two-argument versions, which nothing uses.)
 */
export class Info<T0, T1, T2> {
	arg0: T0
	arg1: T1
	arg2: T2

	constructor(arg0: T0, arg1: T1, arg2: T2) {
		this.arg0 = arg0
		this.arg1 = arg1
		this.arg2 = arg2
	}
}
