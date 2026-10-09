import { expect, test } from "vitest"
import { render } from "vitest-browser-svelte"
import { BattleMessageController } from "#lib/controller/BattleMessageController.svelte.ts"
import BattleMessageControllerView from "./BattleMessageControllerView.svelte"

test("shows the message on the bar across the top, while displayed", async () => {
	const controller = new BattleMessageController()
	const screen = await render(BattleMessageControllerView, { props: { controller } })
	expect(screen.container.querySelector("canvas")).toBeNull()

	controller.display("Prominence")
	const label = screen.getByText("Prominence")
	await expect.element(label).toBeInTheDocument()
	await expect.element(label).toHaveStyle({ color: "rgb(255, 255, 255)" })
	const backer = screen.container.querySelector("canvas")!.parentElement!
	expect(Number(getComputedStyle(backer).opacity)).toBeCloseTo(0.706, 3)
	await expect.element(label, { timeout: 3000 }).not.toBeInTheDocument()
})
