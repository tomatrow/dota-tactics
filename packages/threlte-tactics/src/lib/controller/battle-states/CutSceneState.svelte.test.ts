import { describe, expect, test } from "vitest"
import { Resources } from "#lib/common/Resources.ts"
import { BattleController } from "#lib/controller/BattleController.svelte.ts"
import { advance, useFakeTime } from "#lib/testing/time.ts"

describe("CutSceneState", () => {
	test("plays the intro conversation, advancing on either button, then hands over", async () => {
		useFakeTime()
		const battle = new BattleController(Resources.load("Levels/Level_0")!)
		battle.start()
		await advance(0.1)
		expect(battle.machine.current).toBe("CutSceneState")

		const { conversationController: conversation } = battle
		expect(conversation.canvasActive).toBe(true)
		expect(conversation.rightPanel.message).toBe("Be scared... Cause I am awesome!!!")

		// Unity's IntroScene: 3 speakers, 6 messages.
		for (let i = 0; i < 6; ++i) {
			// Long enough for one panel to leave and the next to arrive.
			await advance(1.2)
			battle.fire(i % 2)
		}
		expect(battle.machine.current).toBe("CutSceneState")
		await advance(0.6)
		// `SelectUnitState` gave a unit its turn.
		expect(battle.machine.current).toBe("CommandSelectionState")
		expect(battle.units).toContain(battle.turn.actor)
		expect(conversation.canvasActive).toBe(false)
	})
})
