import { describe, expect, test } from "vitest"
import { TextAnchor } from "#lib/common/unity/TextAnchor.ts"
import type { ConversationData } from "#lib/model/ConversationData.ts"
import { advance, useFakeTime } from "#lib/testing/time.ts"
import { ConversationController } from "./ConversationController.svelte.ts"

const data: ConversationData = {
	list: [
		{ messages: ["One", "Two"], speaker: "EvilAvatar", anchor: TextAnchor.UpperRight },
		{ messages: ["Three"], speaker: "Avatar", anchor: TextAnchor.LowerLeft }
	]
}

describe("ConversationController", () => {
	test("starts hidden, with both panels at Hide Bottom", () => {
		const controller = new ConversationController()
		expect(controller.canvasActive).toBe(false)
		expect(controller.leftPanel.panel.currentPosition?.name).toBe("Hide Bottom")
		expect(controller.rightPanel.panel.currentPosition?.name).toBe("Hide Bottom")
	})

	test("plays each speaker's messages in their corner, one per next()", async () => {
		useFakeTime()
		const controller = new ConversationController()
		const { leftPanel, rightPanel } = controller
		let complete = false
		void controller.show(data).then(() => (complete = true))

		// The first speaker's panel slides in at the top right.
		expect(controller.canvasActive).toBe(true)
		expect(rightPanel.panel.currentPosition?.name).toBe("Show Top")
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
		expect(rightPanel.panel.currentPosition?.name).toBe("Hide Top")
		controller.next()
		expect(leftPanel.message).toBe("")

		// …then the next speaker's comes in at the bottom left.
		await advance(0.6)
		expect(leftPanel.panel.currentPosition?.name).toBe("Show Bottom")
		expect([leftPanel.speaker, leftPanel.message, leftPanel.arrow]).toEqual([
			"Avatar",
			"Three",
			false
		])

		await advance(0.6)
		controller.next()
		expect(leftPanel.panel.currentPosition?.name).toBe("Hide Bottom")
		expect(complete).toBe(false)

		await advance(0.6)
		expect(complete).toBe(true)
		expect(controller.canvasActive).toBe(false)
	})

	test("does nothing on next() before a conversation", () => {
		const controller = new ConversationController()
		controller.next()
		expect(controller.canvasActive).toBe(false)
	})
})
