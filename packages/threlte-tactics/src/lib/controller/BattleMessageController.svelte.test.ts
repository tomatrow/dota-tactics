import { beforeEach, expect, test } from "vitest"
import { advance, useFakeTime } from "#lib/testing/time.ts"
import { BattleMessageController } from "./BattleMessageController.svelte.ts"

beforeEach(useFakeTime)

test("fades the message in for half a second, shows it for a second, then fades it out", async () => {
	const controller = new BattleMessageController()
	expect(controller.canvasActive).toBe(false)

	controller.display("Earth Render")
	expect(controller).toMatchObject({ canvasActive: true, label: "Earth Render", alpha: 0 })
	// (Give or take a frame.)
	const halfway = () => expect(Math.abs(controller.alpha - 0.5)).toBeLessThan(0.1)
	await advance(0.25)
	halfway()
	await advance(0.3)
	expect(controller.alpha).toBe(1)
	await advance(0.9)
	expect(controller.alpha).toBe(1)
	await advance(0.3)
	halfway()
	expect(controller.canvasActive).toBe(true)
	await advance(0.3)
	expect(controller).toMatchObject({ canvasActive: false, alpha: 0 })
})

test("shows each message it is given", async () => {
	const controller = new BattleMessageController()
	controller.display("Water")
	await advance(2.1)
	controller.display("Cure")
	expect(controller).toMatchObject({ canvasActive: true, label: "Cure", alpha: 0 })
	await advance(0.6)
	expect(controller.alpha).toBe(1)
})
