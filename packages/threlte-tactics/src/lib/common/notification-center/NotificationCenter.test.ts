import { describe, expect, expectTypeOf, test, vi } from "vitest"
import { NotificationCenter, type Handler } from "./NotificationCenter.ts"

class Sender {}

declare module "./NotificationCenter.ts" {
	interface Notifications {
		"Test.Ping": [sender: Sender | null, args: { count: number }]
		"Test.Other": [sender: Sender, args?: undefined]
	}
}

describe("NotificationCenter", () => {
	test("calls the observers of a sender, then the observers of every sender", () => {
		const center = new NotificationCenter()
		const [a, b] = [new Sender(), new Sender()]
		const calls: string[] = []
		center.addObserver((sender) => calls.push(`any ${sender === a ? "a" : "b"}`), "Test.Ping")
		center.addObserver(() => calls.push("from a"), "Test.Ping", a)
		center.addObserver(() => calls.push("from b"), "Test.Ping", b)

		center.postNotification("Test.Ping", a, { count: 0 })
		center.postNotification("Test.Ping", b, { count: 0 })
		expect(calls).toEqual(["from a", "any a", "from b", "any b"])
	})

	test("posts without a sender only to the observers of every sender", () => {
		const center = new NotificationCenter()
		const fromA = vi.fn()
		const any = vi.fn()
		center.addObserver(fromA, "Test.Ping", new Sender())
		center.addObserver(any, "Test.Ping")
		center.postNotification("Test.Ping", null, { count: 1 })
		expect(fromA).not.toHaveBeenCalled()
		expect(any).toHaveBeenCalledWith(null, { count: 1 })
	})

	test("handlers can modify the arguments for later handlers and the poster", () => {
		const center = new NotificationCenter()
		const bump: Handler<"Test.Ping"> = (_sender, args) => void args.count++
		const seen: number[] = []
		center.addObserver(bump, "Test.Ping")
		center.addObserver((_sender, args) => seen.push(args.count), "Test.Ping")
		const args = { count: 0 }
		center.postNotification("Test.Ping", null, args)
		expect(seen).toEqual([1])
		expect(args.count).toBe(1)
	})

	test("adds a handler once per notification and sender", () => {
		const center = new NotificationCenter()
		const handler = vi.fn()
		const sender = new Sender()
		center.addObserver(handler, "Test.Ping")
		center.addObserver(handler, "Test.Ping")
		center.addObserver(handler, "Test.Ping", sender)
		center.postNotification("Test.Ping", sender, { count: 0 })
		expect(handler).toHaveBeenCalledTimes(2)
	})

	test("removes handlers per notification and sender", () => {
		const center = new NotificationCenter()
		const handler = vi.fn()
		const sender = new Sender()
		center.addObserver(handler, "Test.Ping")
		center.addObserver(handler, "Test.Ping", sender)
		center.addObserver(handler, "Test.Other", sender)
		center.removeObserver(handler, "Test.Ping", sender)
		center.removeObserver(handler, "Test.Other")
		center.removeObserver(handler, "Test.Other", new Sender())

		center.postNotification("Test.Ping", sender, { count: 0 })
		center.postNotification("Test.Other", sender)
		expect(handler.mock.calls).toEqual([
			[sender, { count: 0 }],
			[sender, undefined]
		])
	})

	test("changes made while posting take effect from the next post", () => {
		const center = new NotificationCenter()
		const calls: string[] = []
		const second = () => calls.push("second")
		const added = () => calls.push("added")
		center.addObserver(() => {
			calls.push("first")
			center.removeObserver(second, "Test.Ping")
			center.addObserver(added, "Test.Ping")
		}, "Test.Ping")
		center.addObserver(second, "Test.Ping")

		center.postNotification("Test.Ping", null, { count: 0 })
		expect(calls).toEqual(["first", "second"])
		calls.length = 0
		center.postNotification("Test.Ping", null, { count: 0 })
		expect(calls).toEqual(["first", "added"])
	})

	test("a handler can post notifications", () => {
		const center = new NotificationCenter()
		const sender = new Sender()
		const other = vi.fn()
		center.addObserver(() => center.postNotification("Test.Other", sender), "Test.Ping")
		center.addObserver(other, "Test.Other", sender)
		center.postNotification("Test.Ping", null, { count: 0 })
		expect(other).toHaveBeenCalledOnce()
	})

	test("clean forgets notifications without observers", () => {
		const center = new NotificationCenter()
		const handler = vi.fn()
		center.addObserver(handler, "Test.Ping")
		center.removeObserver(handler, "Test.Ping")
		center.clean()
		center.addObserver(handler, "Test.Ping")
		center.postNotification("Test.Ping", null, { count: 0 })
		expect(handler).toHaveBeenCalledOnce()
	})

	test("is typed by notification name", () => {
		const center = new NotificationCenter()
		expectTypeOf<Handler<"Test.Ping">>().toEqualTypeOf<
			(sender: Sender | null, args: { count: number }) => void
		>()
		expect(() => {
			// @ts-expect-error Wrong arguments.
			center.postNotification("Test.Ping", null, { count: "1" })
			// @ts-expect-error Not a notification.
			center.postNotification("Test.Nope", null)
		}).not.toThrow()
	})
})
