import { describe, expect, test } from "vitest"
import type { ConversationData } from "#lib/model/ConversationData.ts"
import { advance, useFakeTime } from "#lib/testing/time.ts"
import { ConversationController } from "./ConversationController.svelte.ts"

const data: ConversationData = {
	list: [
		{ messages: ["One", "Two"], speaker: "EvilAvatar", anchor: "UpperRight" },
		{ messages: ["Three"], speaker: "Avatar", anchor: "LowerLeft" }
	]
}

describe("ConversationController", () => {
	test("starts with both panels hidden", () => {
		const controller = new ConversationController()
		expect([controller.leftPanel.shown, controller.rightPanel.shown]).toEqual([false, false])
	})

	test("plays each speaker's messages in their corner, one per next()", async () => {
		useFakeTime()
		const controller = new ConversationController()
		const { leftPanel, rightPanel } = controller
		let complete = false
		void controller.show(data).then(() => (complete = true))

		// The first speaker's panel slides in at the top right.
		expect([rightPanel.shown, rightPanel.edge]).toEqual([true, "top"])
		expect([rightPanel.speaker, rightPanel.message, rightPanel.arrow]).toEqual([
			"EvilAvatar",
			"One",
			true
		])

		// Input is ignored while a panel moves.
		controller.next()
		expect(rightPanel.message).toBe("One")
		await advance(0.6)

		controller.next()
		expect([rightPanel.message, rightPanel.arrow]).toEqual(["Two", false])

		// Out of messages: the panel leaves the way it came…
		controller.next()
		expect([rightPanel.shown, rightPanel.edge]).toEqual([false, "top"])
		controller.next()
		expect(leftPanel.message).toBe("")

		// …then the next speaker's comes in at the bottom left.
		await advance(0.6)
		expect([leftPanel.shown, leftPanel.edge]).toEqual([true, "bottom"])
		expect([leftPanel.speaker, leftPanel.message, leftPanel.arrow]).toEqual([
			"Avatar",
			"Three",
			false
		])

		await advance(0.6)
		controller.next()
		expect(leftPanel.shown).toBe(false)
		expect(complete).toBe(false)

		await advance(0.6)
		expect(complete).toBe(true)
	})

	test("does nothing on next() before a conversation", () => {
		const controller = new ConversationController()
		controller.next()
		expect([controller.leftPanel.shown, controller.rightPanel.shown]).toEqual([false, false])
	})
})
