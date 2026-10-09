import { beforeEach, expect, test } from "vitest"
import { advance, useFakeTime } from "#lib/testing/time.ts"
import { BattleMessageController } from "./BattleMessageController.svelte.ts"

beforeEach(useFakeTime)

test("shows the message while it fades in (half a second) and for a second after", async () => {
	const controller = new BattleMessageController()
	expect(controller.shown).toBe(false)

	controller.display("Earth Render")
	expect(controller).toMatchObject({ shown: true, label: "Earth Render" })
	await advance(1.4)
	expect(controller.shown).toBe(true)
	await advance(0.2)
	expect(controller.shown).toBe(false)
})

test("shows each message it is given", async () => {
	const controller = new BattleMessageController()
	controller.display("Water")
	await advance(2.1)
	controller.display("Cure")
	expect(controller).toMatchObject({ shown: true, label: "Cure" })
})
